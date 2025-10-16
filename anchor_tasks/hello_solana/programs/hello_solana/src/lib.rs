use anchor_lang::prelude::*;

declare_id!("52kybbvVgPpe8sDmjFAQxTa5291DDeftwfgP4QPt3LAW");

#[program]
pub mod hello_solana {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn say_hello(_ctx: Context<SayHello>) -> Result<()> {
        msg!("Hello, Solana!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct SayHello {}