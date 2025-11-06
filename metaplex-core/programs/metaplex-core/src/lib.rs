use anchor_lang::prelude::*;

pub mod instructions;
use instructions::*;

declare_id!("HUBjpQsy6x6ydWFq1fatHek6ktKW49uP55RdZcgzR6Ed");

#[program]
pub mod metaplex_core {
    use super::*;

    pub fn mint_asset(ctx: Context<MintAsset>) -> Result<()> {
        ctx.accounts.mint_core_asset()
    }

    pub fn transfer_asset(ctx: Context<TransferAsset>) -> Result<()> {
        ctx.accounts.transfer_core_asset()
    }
}

