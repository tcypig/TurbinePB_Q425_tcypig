use anchor_lang::prelude::*;

use anchor_spl::{
    token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked, close_account, CloseAccount},
    associated_token::AssociatedToken,
};

// use super::state::Escrow;
use crate::state::Escrow;

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Refund<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(mint::token_program = token_program)]
    pub mint_a: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = maker,
        associated_token::token_program = token_program,

    )]
    pub maker_ata_a: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        close = maker,
        has_one = mint_a,
        seeds = [b"escrow", maker.key().as_ref(), escrow.seed.to_le_bytes().as_ref()],
        bump,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        associated_token::mint = mint_a,
        associated_token::authority = escrow,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,

}


impl<'info> Refund<'info> {
    pub fn refund_and_close(&mut self) -> Result<()> {
        let maker_key = self.maker.key();
        let seed_bytes = self.escrow.seed.to_le_bytes();
        let bump_bytes = [self.escrow.bump];

        let signer_seeds: [&[&[u8]]; 1] = [&[
            b"escrow",
            maker_key.as_ref(),
            &seed_bytes,
            &bump_bytes,
        ]];

        let transfer_accounts = TransferChecked {
            from: self.vault.to_account_info(),
            to: self.maker_ata_a.to_account_info(),
            authority: self.escrow.to_account_info(),
            mint: self.mint_a.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(self.token_program.to_account_info(), transfer_accounts, &signer_seeds);

        transfer_checked(cpi_ctx, self.vault.amount, self.mint_a.decimals)?;

        let close_accounts = CloseAccount {
            account: self.vault.to_account_info(),
            destination: self.maker.to_account_info(),
            authority: self.escrow.to_account_info(),
        };

        let close_cpi_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(), 
            close_accounts, 
            &signer_seeds
        );

        close_account(close_cpi_ctx)?;

        Ok(())
    }
}