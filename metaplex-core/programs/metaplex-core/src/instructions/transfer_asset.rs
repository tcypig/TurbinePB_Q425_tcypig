use anchor_lang::prelude::*;
use mpl_core::instructions::TransferV1CpiBuilder;

#[derive(Accounts)]
pub struct TransferAsset<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Core Asset account
    #[account(mut)]
    pub asset: UncheckedAccount<'info>,

    /// CHECK: new owner of the asset
    pub new_owner: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,

    /// CHECK: MPL Core
    #[account(address = mpl_core::ID)]
    pub mpl_core_program: UncheckedAccount<'info>,
}

impl<'info> TransferAsset<'info> {
    pub fn transfer_core_asset(&mut self) -> Result<()> {
        TransferV1CpiBuilder::new(&self.mpl_core_program.to_account_info())
            .asset(&self.asset.to_account_info())
            .authority(Some(&self.user.to_account_info()))
            .new_owner(&self.new_owner.to_account_info())
            .payer(&self.user.to_account_info())
            .system_program(Some(&self.system_program.to_account_info()))
            .invoke()?;
        Ok(())
    }
}
