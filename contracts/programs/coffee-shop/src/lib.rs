use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

declare_id!("CoffeeShopPayment11111111111111111111111111");

#[program]
pub mod coffee_shop {
    use super::*;

    pub fn initialize_merchant(
        ctx: Context<InitializeMerchant>,
        merchant_name: String,
        payout_address: Pubkey,
        fee_percentage: u16, // basis points (100 = 1%)
    ) -> Result<()> {
        let merchant = &mut ctx.accounts.merchant;
        merchant.authority = ctx.accounts.authority.key();
        merchant.name = merchant_name;
        merchant.payout_address = payout_address;
        merchant.fee_percentage = fee_percentage;
        merchant.total_sales = 0;
        merchant.total_transactions = 0;
        merchant.is_active = true;
        merchant.created_at = Clock::get()?.unix_timestamp;
        
        Ok(())
    }

    pub fn create_product(
        ctx: Context<CreateProduct>,
        name: String,
        price_usdc: u64, // in lamports (6 decimals for USDC)
        description: String,
    ) -> Result<()> {
        let product = &mut ctx.accounts.product;
        product.merchant = ctx.accounts.merchant.key();
        product.name = name;
        product.price_usdc = price_usdc;
        product.description = description;
        product.is_available = true;
        product.total_sold = 0;
        product.created_at = Clock::get()?.unix_timestamp;
        
        Ok(())
    }

    pub fn process_payment(
        ctx: Context<ProcessPayment>,
        amount: u64,
        tip_amount: u64,
    ) -> Result<()> {
        let merchant = &mut ctx.accounts.merchant;
        let payment = &mut ctx.accounts.payment;
        
        require!(merchant.is_active, CoffeeShopError::MerchantInactive);
        require!(amount > 0, CoffeeShopError::InvalidAmount);
        
        let total_amount = amount + tip_amount;
        let fee_amount = (amount * merchant.fee_percentage as u64) / 10000;
        let merchant_payout = total_amount - fee_amount;
        
        // Transfer USDC from customer to merchant
        let transfer_to_merchant = Transfer {
            from: ctx.accounts.customer_token_account.to_account_info(),
            to: ctx.accounts.merchant_token_account.to_account_info(),
            authority: ctx.accounts.customer.to_account_info(),
        };
        
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                transfer_to_merchant,
            ),
            merchant_payout,
        )?;
        
        // Transfer fee to platform (if any)
        if fee_amount > 0 {
            let transfer_fee = Transfer {
                from: ctx.accounts.customer_token_account.to_account_info(),
                to: ctx.accounts.platform_fee_account.to_account_info(),
                authority: ctx.accounts.customer.to_account_info(),
            };
            
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    transfer_fee,
                ),
                fee_amount,
            )?;
        }
        
        // Record payment
        payment.merchant = merchant.key();
        payment.customer = ctx.accounts.customer.key();
        payment.amount = amount;
        payment.tip_amount = tip_amount;
        payment.fee_amount = fee_amount;
        payment.total_amount = total_amount;
        payment.timestamp = Clock::get()?.unix_timestamp;
        payment.status = PaymentStatus::Completed;
        
        // Update merchant stats
        merchant.total_sales += merchant_payout;
        merchant.total_transactions += 1;
        
        emit!(PaymentProcessed {
            merchant: merchant.key(),
            customer: ctx.accounts.customer.key(),
            amount: total_amount,
            fee_amount,
            timestamp: payment.timestamp,
        });
        
        Ok(())
    }

    pub fn instant_payout(
        ctx: Context<InstantPayout>,
        amount: u64,
    ) -> Result<()> {
        let merchant = &ctx.accounts.merchant;
        
        require!(merchant.is_active, CoffeeShopError::MerchantInactive);
        require!(amount > 0, CoffeeShopError::InvalidAmount);
        
        // Transfer from merchant's business account to their personal payout address
        let transfer_payout = Transfer {
            from: ctx.accounts.merchant_token_account.to_account_info(),
            to: ctx.accounts.payout_token_account.to_account_info(),
            authority: ctx.accounts.merchant_authority.to_account_info(),
        };
        
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                transfer_payout,
            ),
            amount,
        )?;
        
        emit!(InstantPayoutProcessed {
            merchant: merchant.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeMerchant<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Merchant::INIT_SPACE,
        seeds = [b"merchant", authority.key().as_ref()],
        bump
    )]
    pub merchant: Account<'info, Merchant>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateProduct<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Product::INIT_SPACE,
        seeds = [b"product", merchant.key().as_ref(), authority.key().as_ref()],
        bump
    )]
    pub product: Account<'info, Product>,
    
    #[account(
        mut,
        has_one = authority,
        constraint = merchant.is_active @ CoffeeShopError::MerchantInactive
    )]
    pub merchant: Account<'info, Merchant>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessPayment<'info> {
    #[account(
        init,
        payer = customer,
        space = 8 + Payment::INIT_SPACE,
        seeds = [b"payment", merchant.key().as_ref(), customer.key().as_ref()],
        bump
    )]
    pub payment: Account<'info, Payment>,
    
    #[account(mut)]
    pub merchant: Account<'info, Merchant>,
    
    #[account(mut)]
    pub customer: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = customer
    )]
    pub customer_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = merchant.payout_address
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = platform_authority
    )]
    pub platform_fee_account: Account<'info, TokenAccount>,
    
    pub usdc_mint: Account<'info, Mint>,
    /// CHECK: Platform authority for fee collection
    pub platform_authority: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InstantPayout<'info> {
    #[account(
        constraint = merchant.authority == merchant_authority.key()
    )]
    pub merchant: Account<'info, Merchant>,
    
    pub merchant_authority: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = merchant_authority
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = merchant.payout_address
    )]
    pub payout_token_account: Account<'info, TokenAccount>,
    
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct Merchant {
    pub authority: Pubkey,
    #[max_len(50)]
    pub name: String,
    pub payout_address: Pubkey,
    pub fee_percentage: u16,
    pub total_sales: u64,
    pub total_transactions: u64,
    pub is_active: bool,
    pub created_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct Product {
    pub merchant: Pubkey,
    #[max_len(50)]
    pub name: String,
    pub price_usdc: u64,
    #[max_len(200)]
    pub description: String,
    pub is_available: bool,
    pub total_sold: u64,
    pub created_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct Payment {
    pub merchant: Pubkey,
    pub customer: Pubkey,
    pub amount: u64,
    pub tip_amount: u64,
    pub fee_amount: u64,
    pub total_amount: u64,
    pub timestamp: i64,
    pub status: PaymentStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum PaymentStatus {
    Pending,
    Completed,
    Failed,
    Refunded,
}

#[event]
pub struct PaymentProcessed {
    pub merchant: Pubkey,
    pub customer: Pubkey,
    pub amount: u64,
    pub fee_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct InstantPayoutProcessed {
    pub merchant: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum CoffeeShopError {
    #[msg("Merchant is not active")]
    MerchantInactive,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Product not available")]
    ProductNotAvailable,
}
