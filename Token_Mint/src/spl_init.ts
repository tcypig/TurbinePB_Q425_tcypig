import {Keypair, Connection, Commitment} from "@solana/web3.js";
import {createMint} from "@solana/spl-token";
import wallet from "/Users/tiancaiyuan/.config/solana/id.json";

const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));
const commitment: Commitment = "confirmed";

const connection = new Connection("https://api.devnet.solana.com", commitment);

async function main() { 
    try {
      const mint = await createMint(
        connection,          // RPC connection
        keypair,             // payer
        keypair.publicKey,   // mintAuthority
        null,                // freezeAuthority
        6                    // decimals
      );
      console.log("Successfully created mint:", mint.toBase58());
    } catch (error) {
      console.error("Error creating mint:", error);
    }

}

main();