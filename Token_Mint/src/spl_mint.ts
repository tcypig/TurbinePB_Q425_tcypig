import {Keypair, Connection, Commitment, PublicKey} from "@solana/web3.js";
import {createMint} from "@solana/spl-token";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import wallet from "/Users/tiancaiyuan/.config/solana/id.json";


const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);


const token_decimals = 1_000_000n;

const mint = new PublicKey("89brBpJYJ4sRTx9GUCnNMyvNbE2vFX6z69Lmkd2kJ7hA");

async function main() { 
    try {
        // Create an Associated Token Account for the mint
        const ata = await getOrCreateAssociatedTokenAccount(
            connection,
            keypair,
            mint, 
            keypair.publicKey // owner
        );
        console.log("Associated Token Account:", ata.address.toBase58());

        // Mint tokens to the Associated Token Account
        const mintTx = await mintTo(
            connection,
            keypair, // payer
            mint, // mint
            ata.address, // destination
            keypair.publicKey, // authority
            8_444_449
        );
        console.log("Successfully minted tokens. Transaction signature:", mintTx);
    } catch (error) {
      console.error("Error minting tokens:", error);
    }
}

main();

