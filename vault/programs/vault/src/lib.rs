use anchor_lang::prelude::*;
// use anchor_lang::system_program::transfer;
use anchor_spl:: {
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,},
};

declare_id!("BRuSQMfCARmGDq2r8zt412MnXQfoRpQzQ342mf5fUuyS");

#[program]
pub mod vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, amount: u64) -> Result<()> {
        ctx.accounts.initialize(amount, &ctx.bumps)?;
        Ok(())
    }

    // user -> vault token account
    pub fn deposit(ctx: Context<Operations>, amount: u64) -> Result<()> {
        ctx.accounts.deposit(amount)?;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Operations>, amount: u64) -> Result<()> {
        ctx.accounts.withdraw(amount)?;
        Ok(())
    }
}

// Initialize
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = VaultState::INIT_SPACE,
        seeds = [b"state".as_ref(), user.key().as_ref()],
        bump,
    )]
    pub state: Account<'info, VaultState>,

    // vault is PDA authority
    #[account(
        seeds = [b"vault".as_ref(), state.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    // spl token mint
    #[account(mint::token_program = token_program)]
    pub mint: InterfaceAccount<'info, Mint>,

    // vault token account
    #[account(
        init,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
}


impl<'info> Initialize<'info> {
    pub fn initialize(&mut self, amount: u64, bumps: &InitializeBumps) -> Result<()> {
        let state = &mut self.state;
        state.amount = amount;
        state.mint = self.mint.key();
        state.vault_bump = bumps.vault;
        state.state_bump = bumps.state;
        Ok(())
    }
}


// Operations
// Deposit & Withdraw & check balance
#[derive(Accounts)]
pub struct Operations<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"state".as_ref(), user.key().as_ref()],
        bump = state.state_bump,
    )]
    pub state: Account<'info, VaultState>,

    #[account(
        mut,
        seeds = [b"vault".as_ref(), state.key().as_ref()],
        bump = state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    // token mint
    #[account(
        mint::token_program = token_program,
        constraint = mint.key() == state.mint @ VaultError::MintMismatch,
    )]
    pub mint: InterfaceAccount<'info, Mint>,


    // user
    #[account(
        mut,
        token::mint = mint,
        token::authority = user,
    )]
    pub user_ata: InterfaceAccount<'info, TokenAccount>,


    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}


impl<'info> Operations<'info> {
    // user -> vault token account
    pub fn deposit(&mut self, amount: u64) -> Result<()> {
        // let cpi_program = self.system_program.to_account_info();
        // let cpi_accounts = anchor_lang::system_program::Transfer {
        //     from: self.user.to_account_info(),
        //     to: self.vault.to_account_info(),
        // };
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = TransferChecked {
            from: self.user_ata.to_account_info(),
            to: self.vault_token_account.to_account_info(),
            authority: self.user.to_account_info(),
            mint: self.mint.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        // transfer(cpi_ctx, amount)?;
        transfer_checked(cpi_ctx, amount, self.mint.decimals)?;

        self.check_balance()?;

        Ok(())
    }

    pub fn check_balance(&self) -> Result<()> {
        let bal = self.vault_token_account.amount;
        if bal >= self.state.amount && self.state.amount > 0 {
            // return to user

            // let cpi_program = self.system_program.to_account_info();
            // let cpi_accounts = anchor_lang::system_program::Transfer {
            //     from: self.vault.to_account_info(),
            //     to: self.user.to_account_info(),
            // };

            let seeds = &[
                b"vault".as_ref(),
                self.state.to_account_info().key.as_ref(),
                &[self.state.vault_bump],
            ];

            let signer_seeds = &[&seeds[..]];

            let cpi_program = self.token_program.to_account_info();
            let cpi_accounts = TransferChecked {
                from: self.vault_token_account.to_account_info(),
                to: self.user_ata.to_account_info(),
                authority: self.vault.to_account_info(),
                mint: self.mint.to_account_info(),
            };

            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

            // transfer(cpi_ctx, self.vault.lamports())?;
            transfer_checked(cpi_ctx, bal, self.mint.decimals)?;

            self.state.close(self.user.to_account_info())?;

        } 

        Ok(())
    }

    pub fn withdraw(&mut self, amount: u64) -> Result<()> {
        require!(
            self.vault_token_account.amount >= amount,
            VaultError::InsufficientVaultBalance
        );

        // let cpi_program = self.system_program.to_account_info();
        // let cpi_accounts = anchor_lang::system_program::Transfer {
        //     from: self.vault.to_account_info(),
        //     to: self.user.to_account_info(),
        // };

        let seeds = &[
            b"vault".as_ref(),
            self.state.to_account_info().key.as_ref(),
            &[self.state.vault_bump],
        ];

        let signer_seeds = &[&seeds[..]];

        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = TransferChecked {
            from: self.vault_token_account.to_account_info(),
            to: self.user_ata.to_account_info(),
            authority: self.vault.to_account_info(),
            mint: self.mint.to_account_info(),
        };


        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        // transfer(cpi_ctx, amount)?;
        transfer_checked(cpi_ctx, amount, self.mint.decimals)?;

        Ok(())
    }
}


#[account]
pub struct VaultState {
    pub amount: u64,   // target amount
    pub mint: Pubkey,  // spl token mint
    pub vault_bump: u8,
    pub state_bump: u8,
}

impl Space for VaultState {
    const INIT_SPACE: usize = 8 + 32 + 8 + 1 + 1;
}

#[error_code]
pub enum VaultError {
    #[msg("Amount must be greater than 0")]
    InvalidAmount,
    #[msg("Vault balance is insufficient")]
    InsufficientVaultBalance,
    #[msg("Mint does not match state.mint")]
    MintMismatch,
}