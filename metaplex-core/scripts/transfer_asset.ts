import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";

const MPL_CORE_PROGRAM_ID = new web3.PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");
const PROGRAM_ID = new web3.PublicKey("HUBjpQsy6x6ydWFq1fatHek6ktKW49uP55RdZcgzR6Ed");

const ASSET_PUBKEY = new web3.PublicKey("Fx8QzeQBT2DQsM2zMb2Ur63LQNjaiax9VgB7ZVHhVUSZ");
const NEW_OWNER    = new web3.PublicKey("2kFz6MfEMy1iTe8zaqgxjZi8dmuxaYviX3N3w7t9JNLX");

async function main() {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);
  
  const idl = await Program.fetchIdl(PROGRAM_ID, provider);
  const program = new Program(idl as anchor.Idl, provider);

  const sig = await program.methods
    .transferAsset()
    .accounts({
      user: provider.wallet.publicKey,
      asset: ASSET_PUBKEY,
      newOwner: NEW_OWNER,
      systemProgram: web3.SystemProgram.programId,
      mplCoreProgram: MPL_CORE_PROGRAM_ID,
    })
    .rpc();

  console.log("✅ Transfer Tx:", sig);
}

main().catch(console.error);
