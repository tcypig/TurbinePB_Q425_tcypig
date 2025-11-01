import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

const PROGRAM_ID = new PublicKey("EXBqujt2pjtx1rdTMDJS7VK15TKRB5Ru99hHRR5Zfm2d"); 

const MAKER = anchor.AnchorProvider.env().wallet.publicKey;
const MINT_A = new PublicKey("89brBpJYJ4sRTx9GUCnNMyvNbE2vFX6z69Lmkd2kJ7hA");
const MINT_B = new PublicKey("Cj6fXj9r9yZidsTn5kdiw3VqsJPtb2Z5QpTeqnFgkzik");
const MAKER_ATA_A = new PublicKey("6EQ6diuQh7wh4kHB6gawHjQEbvwaaxkSX5ji5pCELJqS");
const ESCROW = new PublicKey("GQjr4tnd1hLA52FzXtLd8ou5Sdhyhge2QSkcFn6HJVqn");
const VAULT = new PublicKey("Bv3niDzkbiWUEwmLT1QsTKMQpzfVuJ8PjzS9rzfGbYW1");

(async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program =
    (anchor.workspace as any).Escrow ??
    (anchor.workspace as any).escrow;

  console.log("ProgramID:", program.programId.toBase58());
  console.log("Using wallet:", MAKER.toBase58());

  const tx = await program.methods
    .initialize(new anchor.BN(1), new anchor.BN(1_000_000), new anchor.BN(1_000_000))
    .accounts({
      maker: MAKER,
      makerAtaA: MAKER_ATA_A,
      mintA: MINT_A,
      mintB: MINT_B,
      escrow: ESCROW,
      vault: VAULT,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("✅ Initialize sent!");
  console.log("Transaction signature:", tx);
})();
