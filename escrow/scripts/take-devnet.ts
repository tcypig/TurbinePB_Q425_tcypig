import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Program
const PROGRAM_ID = new PublicKey("EXBqujt2pjtx1rdTMDJS7VK15TKRB5Ru99hHRR5Zfm2d");

// Mints
const MINT_A = new PublicKey("89brBpJYJ4sRTx9GUCnNMyvNbE2vFX6z69Lmkd2kJ7hA"); 
const MINT_B = new PublicKey("Cj6fXj9r9yZidsTn5kdiw3VqsJPtb2Z5QpTeqnFgkzik"); 

// Parties
const MAKER = new PublicKey("Co5RGd3K6CqdPp7WvWUw3VEngCtu8Pk9Qmgz7cReSBDp");

// Escrow & Vault
const ESCROW = new PublicKey("GQjr4tnd1hLA52FzXtLd8ou5Sdhyhge2QSkcFn6HJVqn");
const VAULT  = new PublicKey("Bv3niDzkbiWUEwmLT1QsTKMQpzfVuJ8PjzS9rzfGbYW1");

// Token accounts 
const MAKER_ATA_B = new PublicKey("7Y5rXDenoYqkceW3gMmnkMZHifxmVCfiH2hfZj3YQyZS");
const TAKER_ATA_B = new PublicKey("r7qNiXFfd1vznQrHNCAciJcYtyHRNqiqmC3cLH7hoab");

(async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = (anchor.workspace as any).Escrow ?? (anchor.workspace as any).escrow;

  const TAKER_ATA_A = getAssociatedTokenAddressSync(
    MINT_A,
    provider.wallet.publicKey, // taker
    false,
    TOKEN_PROGRAM_ID
  );

  console.log("ProgramID:", program.programId.toBase58());
  console.log("Taker wallet:", provider.wallet.publicKey.toBase58());
  console.log("Maker:", MAKER.toBase58());
  console.log("takerAtaA:", TAKER_ATA_A.toBase58());

  const sig = await program.methods
    .take()
    .accounts({
      taker: provider.wallet.publicKey,
      maker: MAKER,
      mintA: MINT_A,
      mintB: MINT_B,
      makerAtaB: MAKER_ATA_B,
      takerAtaA: TAKER_ATA_A,
      takerAtaB: TAKER_ATA_B,
      escrow: ESCROW,
      vault: VAULT,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("✅ take() sent!");
  console.log("Transaction signature:", sig);
})();
