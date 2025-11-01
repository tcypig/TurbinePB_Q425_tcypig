import { PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID, 
} from "@solana/spl-token";

const MAKER = new PublicKey("Co5RGd3K6CqdPp7WvWUw3VEngCtu8Pk9Qmgz7cReSBDp"); 
const PROGRAM_ID = new PublicKey("EXBqujt2pjtx1rdTMDJS7VK15TKRB5Ru99hHRR5Zfm2d");
const MINT_A = new PublicKey("89brBpJYJ4sRTx9GUCnNMyvNbE2vFX6z69Lmkd2kJ7hA");
const SEED_U64 = 1n; 

function u64le(n: bigint) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(n);
  return buf;
}

async function main() {
  // 2) escrow PDA
  const [escrowPda, bump] = await PublicKey.findProgramAddress(
    [Buffer.from("escrow"), MAKER.toBuffer(), u64le(SEED_U64)],
    PROGRAM_ID
  );

  // 3) vault（escrow ATA：owner=escrowPda, mint=MINT_A）
  const vault = getAssociatedTokenAddressSync(
    MINT_A,
    escrowPda,
    true,              
    TOKEN_PROGRAM_ID   
  );

  console.log("escrow PDA:", escrowPda.toBase58());
  console.log("bump:", bump);
  console.log("vault ATA (A):", vault.toBase58());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
