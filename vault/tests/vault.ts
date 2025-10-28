import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";

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

  it("Is initialized!", async () => {
    const tx = await program.methods
    .initialize(new anchor.BN(2 * anchor.web3.LAMPORTS_PER_SOL))
    .accountsPartial({
      user: provider.publicKey,
      state: vaultState,
      vault: vault,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

    console.log("Your transaction signature", tx);
  });
});
