import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,        
  createMint,
  createAccount,
  mintTo,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

describe("escrow", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.escrow as Program<Escrow>;

  const feePayer = (provider.wallet as any).payer;
  if (!feePayer) {
    throw new Error("feePayer is undefined. Set ANCHOR_WALLET to a local keypair and run in Node.");
  }

  const maker = provider.wallet;

  let mintA: PublicKey;
  let makerAtaA: PublicKey;
  let vault: PublicKey;
  let escrowPda: PublicKey;
  let escrowBump: number;
  const seed = new anchor.BN(1);
  const depositAmount = 1_000_000; // 1 token (if mint decimals = 6)

  let mintB: PublicKey;
  let makerAtaB: PublicKey;

  let taker: Keypair;
  let takerAtaB: PublicKey;
  let takerAtaA: PublicKey; 

  before(async () => {
    // 1. Create token mint
    mintA = await createMint(
      provider.connection,
      feePayer,
      feePayer.publicKey,
      null,
      6 // decimals
    );

    mintB = await createMint(
      provider.connection,
      feePayer,
      feePayer.publicKey,
      null,
      6
    );


    // 2. Create maker's token account (ATA)
    makerAtaA = await createAccount(
      provider.connection,
      feePayer,
      mintA,
      maker.publicKey
    );

    makerAtaB = await createAccount(
      provider.connection,
      feePayer,
      mintB,
      maker.publicKey
    );


    // 3. Mint some tokens to maker
    await mintTo(
      provider.connection,
      feePayer,
      mintA,
      makerAtaA,
      feePayer,
      10_000_000 // 10 tokens
    );

    // 4. Derive PDA (escrow account)
    [escrowPda, escrowBump] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBuffer(),
        seed.toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    // 5. Derive vault PDA ATA (associated with escrow)
    vault = getAssociatedTokenAddressSync(
      mintA,
      escrowPda,
      true,                    // allowOwnerOffCurve
      TOKEN_PROGRAM_ID
    );

    // 6. Create taker
    taker = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(taker.publicKey, 2e9), // 2 SOL
      "confirmed"
    );

    // 7. Create taker's B ATAs
    takerAtaB = await createAccount(
      provider.connection,
      feePayer,
      mintB,
      taker.publicKey
    );

    // 8. mint to taker's B ATA
    await mintTo(
      provider.connection,
      feePayer,
      mintB,
      takerAtaB,
      feePayer,
      2_000_000  // 2 B（decimals=6）
    );

    // 9. Create taker's A ATAs
    takerAtaA = getAssociatedTokenAddressSync(
      mintA,
      taker.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );


  });

  console.log("IDL instructions:", program.idl.instructions.map(ix => ix.name));

  it("Is initialized and locks token A into escrow vault ATA", async () => {
    await (program as any).methods
      .initialize(seed, new anchor.BN(depositAmount), new anchor.BN(1_000_000))
      .accounts({
        maker: maker.publicKey,
        makerAtaA,
        mintA,
        mintB, 
        escrow: escrowPda,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,  
      })
      .rpc();

      // check balances
      const vaultAccount = await getAccount(provider.connection, vault);
      const makerAccount = await getAccount(provider.connection, makerAtaA);

      console.log("Vault amount:", vaultAccount.amount.toString());
      console.log("Maker amount:", makerAccount.amount.toString());

      // Expect vault has depositAmount
      if (Number(vaultAccount.amount) !== depositAmount) {
        throw new Error("Vault did not receive the correct amount");
      }

  });


  it("Taker pays B and receives A; vault and escrow closed", async () => {
    await program.methods
      .take()
      .accountsPartial({
        taker: taker.publicKey,
        maker: maker.publicKey,
        mintA,
        mintB,
        makerAtaB,     
        takerAtaA,     
        takerAtaB,    
        escrow: escrowPda,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([taker]) 
      .rpc();

    const makerB = await getAccount(provider.connection, makerAtaB);
    if (makerB.amount !== 1_000_000n) {
      throw new Error(`Maker B not received: ${makerB.amount}`);
    }

    const takerA = await getAccount(provider.connection, takerAtaA);
    if (takerA.amount !== BigInt(depositAmount)) {
      throw new Error(`Taker A not received: ${takerA.amount}`);
    }

    const vaultInfo = await provider.connection.getAccountInfo(vault);
    const escrowInfo = await provider.connection.getAccountInfo(escrowPda);
    if (vaultInfo !== null) throw new Error("Vault not closed");
    if (escrowInfo !== null) throw new Error("Escrow not closed");

  });

  it("Maker can refund A when no taker fills the order", async () => {
    const refundSeed = new anchor.BN(Date.now());

    // Derive new PDA and vault for refund test
    const [escrowPda2] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBuffer(),
        refundSeed.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const vault2 = getAssociatedTokenAddressSync(
      mintA,
      escrowPda2,
      true,
      TOKEN_PROGRAM_ID
    );

    const makerBefore = await getAccount(provider.connection, makerAtaA);

    // initialize new escrow
    await (program as any).methods
      .initialize(refundSeed, new anchor.BN(depositAmount), new anchor.BN(1_000_000))
      .accounts({
        maker: maker.publicKey,
        makerAtaA,
        mintA,
        mintB,
        escrow: escrowPda2,
        vault: vault2,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const vaultAfterInit = await getAccount(provider.connection, vault2);
    if (Number(vaultAfterInit.amount) !== depositAmount) {
      throw new Error("Refund test: vault2 did not receive correct amount");
    }

    // refund
    await program.methods
      .refund()
      .accountsPartial({
        maker: maker.publicKey,
        mintA,
        makerAtaA,
        escrow: escrowPda2,
        vault: vault2,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // check maker's A balance restored
    const makerAfter = await getAccount(provider.connection, makerAtaA);
    if (makerAfter.amount !== makerBefore.amount) {
      throw new Error(
        `Refund did not restore maker balance, before=${makerBefore.amount}, after=${makerAfter.amount}`
      );
    }

    // check vault2 / escrowPda2 closed
    const vaultInfo2 = await provider.connection.getAccountInfo(vault2);
    const escrowInfo2 = await provider.connection.getAccountInfo(escrowPda2);
    if (vaultInfo2 !== null) throw new Error("Refund test: vault2 not closed");
    if (escrowInfo2 !== null) throw new Error("Refund test: escrowPda2 not closed");
  });


});
 