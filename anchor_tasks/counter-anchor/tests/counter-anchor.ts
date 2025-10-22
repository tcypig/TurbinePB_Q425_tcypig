import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CounterAnchor } from "../target/types/counter_anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("counter-anchor", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.counterAnchor as Program<CounterAnchor>;

  const [counterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter")],
    program.programId
  );

  it("Is initialized!", async () => {
    await program.methods.initialize().accounts({
      payer: provider.wallet.publicKey,
      // systemProgram: SystemProgram.programId,
    }).rpc();

    const acc = await program.account.counter.fetch(counterPda);
    expect(acc.count.toNumber()).to.eq(0);
  });

  it("increment", async () => {
    await program.methods.increment().rpc();
    const acc = await program.account.counter.fetch(counterPda);
    expect(acc.count.toNumber()).to.eq(1);
  });
});
