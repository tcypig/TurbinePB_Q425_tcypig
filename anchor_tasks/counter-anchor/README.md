# Counter Anchor

## Overview

**Counter Anchor** is a simple Solana on-chain program built with Anchor.
It demonstrates how to:
- Initialize a Program Derived Account (PDA)
- Store on-chain state (count)
- Update that state via program instructions


## Use Case
As a user, I want to keep a shared on-chain counter that anyone can increment,
so that we can track the number of interactions stored permanently on Solana.

The program creates a single counter account (PDA), initialized with count = 0.
Each call to the increment instruction increases the counter by 1.


## Architecture Diagram
[User Wallet / Client]
        │
        ▼
   (send transaction)
        │
        ▼
[Anchor Program: counter_anchor]
   ├── initialize() → create Counter PDA (count = 0)
   └── increment()  → update count += 1
        │
        ▼
[Counter PDA Account on Solana]
   stores: { count: u64 }


## ⚙️ How to Run
- Build the program: anchor build
- Run tests: anchor test