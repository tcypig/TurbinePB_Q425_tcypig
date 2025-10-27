import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  publicKey,
  signerIdentity,
  createSignerFromKeypair,
} from "@metaplex-foundation/umi";
import {
  createV1,
  findMetadataPda,
  mplTokenMetadata,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import fs from "fs";
import { percentAmount } from "@metaplex-foundation/umi";

async function main() {
  // args: <MINT> <NAME> <SYMBOL> <URI?>
  const [, , mintStr, name, symbol, uriArg] = process.argv;
  if (!mintStr || !name || !symbol) {
    console.error(
      "Usage: ts-node create_metadata_umi.ts <MINT> <NAME> <SYMBOL> [URI='']"
    );
    process.exit(1);
  }
  const uri = uriArg ?? ""; 

  // connect to devnet and setup Umi
  const umi = createUmi("https://api.devnet.solana.com")
    .use(mplTokenMetadata())
    .use(mplToolbox());

  const secret = JSON.parse(
    fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, "utf-8")
  );
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret));
  umi.use(signerIdentity(createSignerFromKeypair(umi, keypair)));

  const mint = publicKey(mintStr);

  const metadataPda = await findMetadataPda(umi, { mint });

  const tx = await createV1(umi, {
    mint,
    authority: umi.identity,      // mintAuthority / updateAuthority
    payer: umi.identity,
    updateAuthority: umi.identity,
    name,
    symbol,
    uri,
    sellerFeeBasisPoints: percentAmount(0),
    tokenStandard: TokenStandard.Fungible,
  }).sendAndConfirm(umi);

  console.log("Metadata created");
  console.log("Mint:         ", mintStr);
  console.log("Metadata PDA: ", metadataPda.toString());
  console.log("Tx:           ", tx.signature.toString());
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
