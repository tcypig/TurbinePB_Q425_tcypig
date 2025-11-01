#![allow(unexpected_cfgs, deprecated)]
use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

use instructions::*;
// use state::*;

declare_id!("EXBqujt2pjtx1rdTMDJS7VK15TKRB5Ru99hHRR5Zfm2d");

#[program]
pub mod escrow {
    use super::*;

    // Initialize an escrow trade (maker deposits tokens)
    pub fn initialize(ctx: Context<Make>, seed: u64, deposit: u64, receive: u64) -> Result<()> {
        ctx.accounts.init_escrow(seed, receive, &ctx.bumps)?;
        ctx.accounts.deposit(deposit)?;
        Ok(())
    }

    pub fn take(ctx: Context<Take>) -> Result<()> {
        // taker_ata_b -> maker_ata_b
        ctx.accounts.deposit()?;
        // vault -> taker_ata_a
        ctx.accounts.withdraw_and_close_vault()?;
        Ok(())
    }


    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        ctx.accounts.refund_and_close()?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
