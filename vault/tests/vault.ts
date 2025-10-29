import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";
import { expect } from "chai";
import {
  createMint,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("vault", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.vault as Program<Vault>;

  const vaultState = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("state"), provider.publicKey.toBuffer()],
    program.programId
  )[0];
  
  const vault = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), vaultState.toBytes()],
    program.programId
  )[0];
  
  // it("Is initialized!", async () => {
  //   const tx = await program.methods
  //   .initialize(new anchor.BN(2 * anchor.web3.LAMPORTS_PER_SOL))
  //   .accountsPartial({
  //     user: provider.publicKey,
  //     state: vaultState,
  //     vault: vault,
  //     systemProgram: anchor.web3.SystemProgram.programId,
  //   })
  //   .rpc();

  //   console.log("Your transaction signature", tx);
  // });

  it("initializes the vault", async () => {
    const decimals = 6;
    const mintPubkey = await createMint(
      provider.connection,
      (provider.wallet as any).payer,
      provider.publicKey,
      null,
      decimals
    );

    const vaultAta = await getAssociatedTokenAddress(
      mintPubkey,
      vault,
      true,                // owner 是 PDA → true
      TOKEN_PROGRAM_ID
    );

    const targetAmount = new anchor.BN(5_000_000);

    const txSig = await program.methods
      .initialize(targetAmount)
      .accountsPartial({
        user: provider.publicKey,
        state: vaultState,
        vault: vault,
        mint: mintPubkey,
        vaultTokenAccount: vaultAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ initialize tx:", txSig);

    const state = await program.account.vaultState.fetch(vaultState);
    expect(state.mint.toBase58()).to.equal(mintPubkey.toBase58());
    expect(state.amount.toString()).to.equal(targetAmount.toString());
    expect(state.vaultBump).to.be.a("number");
    expect(state.stateBump).to.be.a("number");

    console.log("state.mint:", state.mint.toBase58());
    console.log("vault ATA:", vaultAta.toBase58());
  });

  it("deposits tokens from user ATA into the vault ATA", async () => {
    const state = await program.account.vaultState.fetch(vaultState).catch(() => null);
    if (!state) {
      throw new Error("VaultState not found. 请先运行上面的 initialize 用例，或把两者合并为同一个 it。");
    }

    const mintPubkey = state.mint as anchor.web3.PublicKey;

    const vaultAta = await getAssociatedTokenAddress(
      mintPubkey,
      vault,
      true, // PDA owner → true
      TOKEN_PROGRAM_ID
    );

    const userAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as any).payer,
      mintPubkey,
      provider.publicKey 
    );

    await mintTo(
      provider.connection,
      (provider.wallet as any).payer,
      mintPubkey,
      userAta.address,
      (provider.wallet as any).payer, // mint authority
      10_000_000 
    );

    const beforeUser = await provider.connection.getTokenAccountBalance(userAta.address);
    const beforeVault = await provider.connection.getTokenAccountBalance(vaultAta);
    console.log("Before deposit - user:", beforeUser.value.amount, "vault:", beforeVault.value.amount);

    // deposit
    const depositAmount = new anchor.BN(3_000_000);
    const txSig = await program.methods
      .deposit(depositAmount)
      .accountsPartial({
        user: provider.publicKey,
        state: vaultState,
        vault,
        mint: mintPubkey,
        userAta: userAta.address,
        vaultTokenAccount: vaultAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ deposit tx:", txSig);

    const afterUser = await provider.connection.getTokenAccountBalance(userAta.address);
    const afterVault = await provider.connection.getTokenAccountBalance(vaultAta);

    const userDelta = BigInt(beforeUser.value.amount) - BigInt(afterUser.value.amount);
    const vaultDelta = BigInt(afterVault.value.amount) - BigInt(beforeVault.value.amount);

    expect(userDelta.toString()).to.equal(depositAmount.toString());
    expect(vaultDelta.toString()).to.equal(depositAmount.toString());

    const state2 = await program.account.vaultState.fetch(vaultState);
    expect(state2.mint.toBase58()).to.equal(mintPubkey.toBase58());
  });


  
});
