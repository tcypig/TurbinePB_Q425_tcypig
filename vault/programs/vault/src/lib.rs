use anchor_lang::prelude::*;
use anchor_lang::system_program::transfer;

declare_id!("CPa1vVoGeqFTRYzQD7PSJvYdDe5B2XMpchJaNPdscyZH");

#[program]
pub mod vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, amount: u64) -> Result<()> {
        ctx.accounts.initialize(amount, &ctx.bumps)?;
        Ok(())
    }

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

    #[account(
        seeds = [b"vault".as_ref(), state.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}


impl<'info> Initialize<'info> {
    pub fn initialize(&mut self, amount: u64, bumps: &InitializeBumps) -> Result<()> {
        let state = &mut self.state;
        state.amount = amount;
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
        seeds = [b"vault".as_ref(), state.key().as_ref()],
        bump = state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        seeds = [b"state".as_ref(), user.key().as_ref()],
        bump = state.state_bump,
    )]
    pub state: Account<'info, VaultState>,

    pub system_program: Program<'info, System>,
}


impl<'info> Operations<'info> {
    pub fn deposit(&mut self, amount: u64) -> Result<()> {
        let cpi_program = self.system_program.to_account_info();
        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: self.user.to_account_info(),
            to: self.vault.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        transfer(cpi_ctx, amount)?;

        self.check_balance()?;

        Ok(())
    }

    pub fn check_balance(&self) -> Result<()> {
        if self.vault.lamports() >= self.state.amount {
            let cpi_program = self.system_program.to_account_info();
            let cpi_accounts = anchor_lang::system_program::Transfer {
                from: self.vault.to_account_info(),
                to: self.user.to_account_info(),
            };

            let seeds = &[
                b"vault".as_ref(),
                self.state.to_account_info().key.as_ref(),
                &[self.state.vault_bump],
            ];

            let signer_seeds = &[&seeds[..]];

            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

            transfer(cpi_ctx, self.vault.lamports())?;

            self.state.close(self.user.to_account_info())?;

        } 

        Ok(())
    }

    pub fn withdraw(&mut self, amount: u64) -> Result<()> {
        let cpi_program = self.system_program.to_account_info();
        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: self.vault.to_account_info(),
            to: self.user.to_account_info(),
        };

        let seeds = &[
            b"vault".as_ref(),
            self.state.to_account_info().key.as_ref(),
            &[self.state.vault_bump],
        ];

        let signer_seeds = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        transfer(cpi_ctx, amount)?;

        Ok(())
    }
}


#[account]
pub struct VaultState {
    pub amount: u64,
    pub vault_bump: u8,
    pub state_bump: u8,
}

impl Space for VaultState {
    const INIT_SPACE: usize = 8 + 8 + 1 + 1;
}