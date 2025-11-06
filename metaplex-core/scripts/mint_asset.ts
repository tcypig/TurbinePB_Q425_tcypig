import * as anchor from "@coral-xyz/anchor";
import { web3, Program, AnchorProvider } from "@coral-xyz/anchor";
import { MetaplexCore } from "../target/types/metaplex_core";

const PROGRAM_ID = new web3.PublicKey("HUBjpQsy6x6ydWFq1fatHek6ktKW49uP55RdZcgzR6Ed");
const MPL_CORE_PROGRAM_ID = new web3.PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");

async function main() {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const idl = await Program.fetchIdl(PROGRAM_ID, provider);
  const program = new Program(idl as anchor.Idl, provider);

  const asset = web3.Keypair.generate();

  const txSig = await program.methods
    .mintAsset()
    .accounts({
      user: provider.wallet.publicKey,
      mint: asset.publicKey,
      systemProgram: web3.SystemProgram.programId,
      mplCoreProgram: MPL_CORE_PROGRAM_ID,
    })
    .signers([asset])
    .rpc();

  console.log("✅ Transaction signature:", txSig);
  console.log("🪙 Asset public key:", asset.publicKey.toBase58());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
