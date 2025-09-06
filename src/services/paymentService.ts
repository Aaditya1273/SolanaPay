import { ethers } from 'ethers';

export interface PaymentProvider {
  id: string;
  name: string;
  logo: string;
  supportedRegions: string[];
  supportedCurrencies: string[];
  supportedCryptos: string[];
  minAmount: number;
  maxAmount: number;
  fees: {
    percentage: number;
    fixed: number;
    currency: string;
  };
  processingTime: string;
  kycRequired: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  type: 'bank_transfer' | 'card' | 'mobile_money' | 'upi' | 'wallet';
  supportedRegions: string[];
  processingTime: string;
  limits: {
    min: number;
    max: number;
    currency: string;
  };
}

export interface RegionConfig {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  language: string;
  timezone: string;
  kycRequirements: {
    level1: string[];
    level2: string[];
    level3: string[];
  };
  paymentMethods: string[];
  preferredProviders: string[];
  feeOptimization: {
    lowFeeThreshold: number;
    preferredMethod: string;
    bulkDiscountThreshold: number;
  };
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: string;
  required: boolean;
  estimatedTime: number;
  dependencies: string[];
}

export interface KYCDocument {
  type: 'passport' | 'national_id' | 'drivers_license' | 'utility_bill' | 'bank_statement';
  required: boolean;
  alternatives: string[];
  description: string;
}

export interface PurchaseQuote {
  providerId: string;
  fiatAmount: number;
  fiatCurrency: string;
  cryptoAmount: number;
  cryptoCurrency: string;
  exchangeRate: number;
  fees: {
    providerFee: number;
    networkFee: number;
    platformFee: number;
    total: number;
  };
  processingTime: string;
  expiresAt: Date;
  paymentMethods: string[];
}

class PaymentService {
  private providers: Map<string, PaymentProvider> = new Map();
  private regions: Map<string, RegionConfig> = new Map();
  private paymentMethods: Map<string, PaymentMethod> = new Map();

  constructor() {
    this.initializeProviders();
    this.initializeRegions();
    this.initializePaymentMethods();
  }

  private initializeProviders() {
    const providers: PaymentProvider[] = [
      {
        id: 'ramp',
        name: 'Ramp Network',
        logo: '/images/providers/ramp.png',
        supportedRegions: ['US', 'EU', 'UK', 'CA', 'AU', 'SG', 'IN'],
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'INR'],
        supportedCryptos: ['ETH', 'USDC', 'USDT', 'BTC'],
        minAmount: 20,
        maxAmount: 20000,
        fees: {
          percentage: 2.9,
          fixed: 0,
          currency: 'USD'
        },
        processingTime: '5-15 minutes',
        kycRequired: true
      },
      {
        id: 'moonpay',
        name: 'MoonPay',
        logo: '/images/providers/moonpay.png',
        supportedRegions: ['US', 'EU', 'UK', 'CA', 'AU', 'BR', 'IN', 'ZA'],
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'BRL', 'INR', 'ZAR'],
        supportedCryptos: ['ETH', 'USDC', 'USDT', 'BTC', 'MATIC'],
        minAmount: 15,
        maxAmount: 50000,
        fees: {
          percentage: 4.5,
          fixed: 0,
          currency: 'USD'
        },
        processingTime: '10-30 minutes',
        kycRequired: true
      },
      {
        id: 'razorpay',
        name: 'Razorpay (UPI)',
        logo: '/images/providers/razorpay.png',
        supportedRegions: ['IN'],
        supportedCurrencies: ['INR'],
        supportedCryptos: ['ETH', 'USDC', 'USDT'],
        minAmount: 100,
        maxAmount: 200000,
        fees: {
          percentage: 1.5,
          fixed: 0,
          currency: 'INR'
        },
        processingTime: '2-5 minutes',
        kycRequired: false
      },
      {
        id: 'mpesa',
        name: 'M-Pesa Gateway',
        logo: '/images/providers/mpesa.png',
        supportedRegions: ['KE', 'TZ', 'UG', 'GH', 'ZA'],
        supportedCurrencies: ['KES', 'TZS', 'UGX', 'GHS', 'ZAR'],
        supportedCryptos: ['ETH', 'USDC', 'USDT'],
        minAmount: 50,
        maxAmount: 10000,
        fees: {
          percentage: 2.0,
          fixed: 0,
          currency: 'KES'
        },
        processingTime: '1-3 minutes',
        kycRequired: false
      },
      {
        id: 'transak',
        name: 'Transak',
        logo: '/images/providers/transak.png',
        supportedRegions: ['US', 'EU', 'UK', 'IN', 'BR', 'MX', 'AR'],
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'INR', 'BRL', 'MXN', 'ARS'],
        supportedCryptos: ['ETH', 'USDC', 'USDT', 'BTC', 'MATIC'],
        minAmount: 30,
        maxAmount: 25000,
        fees: {
          percentage: 3.5,
          fixed: 0,
          currency: 'USD'
        },
        processingTime: '5-20 minutes',
        kycRequired: true
      }
    ];

    providers.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  private initializeRegions() {
    const regions: RegionConfig[] = [
      {
        code: 'US',
        name: 'United States',
        currency: 'USD',
        currencySymbol: '$',
        language: 'en',
        timezone: 'America/New_York',
        kycRequirements: {
          level1: ['email', 'phone'],
          level2: ['government_id', 'address_proof'],
          level3: ['ssn', 'income_verification']
        },
        paymentMethods: ['card', 'bank_transfer', 'ach'],
        preferredProviders: ['ramp', 'moonpay', 'transak'],
        feeOptimization: {
          lowFeeThreshold: 1000,
          preferredMethod: 'bank_transfer',
          bulkDiscountThreshold: 10000
        }
      },
      {
        code: 'IN',
        name: 'India',
        currency: 'INR',
        currencySymbol: '₹',
        language: 'en',
        timezone: 'Asia/Kolkata',
        kycRequirements: {
          level1: ['email', 'phone'],
          level2: ['aadhaar', 'pan'],
          level3: ['bank_statement', 'income_proof']
        },
        paymentMethods: ['upi', 'card', 'netbanking', 'wallet'],
        preferredProviders: ['razorpay', 'ramp', 'transak'],
        feeOptimization: {
          lowFeeThreshold: 50000,
          preferredMethod: 'upi',
          bulkDiscountThreshold: 500000
        }
      },
      {
        code: 'KE',
        name: 'Kenya',
        currency: 'KES',
        currencySymbol: 'KSh',
        language: 'en',
        timezone: 'Africa/Nairobi',
        kycRequirements: {
          level1: ['email', 'phone'],
          level2: ['national_id'],
          level3: ['utility_bill', 'bank_statement']
        },
        paymentMethods: ['mobile_money', 'card', 'bank_transfer'],
        preferredProviders: ['mpesa'],
        feeOptimization: {
          lowFeeThreshold: 5000,
          preferredMethod: 'mobile_money',
          bulkDiscountThreshold: 50000
        }
      },
      {
        code: 'EU',
        name: 'European Union',
        currency: 'EUR',
        currencySymbol: '€',
        language: 'en',
        timezone: 'Europe/London',
        kycRequirements: {
          level1: ['email', 'phone'],
          level2: ['government_id', 'address_proof'],
          level3: ['bank_statement', 'source_of_funds']
        },
        paymentMethods: ['sepa', 'card', 'bank_transfer'],
        preferredProviders: ['ramp', 'moonpay', 'transak'],
        feeOptimization: {
          lowFeeThreshold: 1000,
          preferredMethod: 'sepa',
          bulkDiscountThreshold: 10000
        }
      },
      {
        code: 'BR',
        name: 'Brazil',
        currency: 'BRL',
        currencySymbol: 'R$',
        language: 'pt',
        timezone: 'America/Sao_Paulo',
        kycRequirements: {
          level1: ['email', 'phone'],
          level2: ['cpf', 'rg'],
          level3: ['bank_statement', 'income_proof']
        },
        paymentMethods: ['pix', 'card', 'bank_transfer'],
        preferredProviders: ['moonpay', 'transak'],
        feeOptimization: {
          lowFeeThreshold: 5000,
          preferredMethod: 'pix',
          bulkDiscountThreshold: 50000
        }
      }
    ];

    regions.forEach(region => {
      this.regions.set(region.code, region);
    });
  }

  private initializePaymentMethods() {
    const methods: PaymentMethod[] = [
      {
        id: 'upi',
        name: 'UPI (Unified Payments Interface)',
        icon: '/images/payment-methods/upi.png',
        type: 'upi',
        supportedRegions: ['IN'],
        processingTime: '1-2 minutes',
        limits: {
          min: 1,
          max: 100000,
          currency: 'INR'
        }
      },
      {
        id: 'mpesa',
        name: 'M-Pesa',
        icon: '/images/payment-methods/mpesa.png',
        type: 'mobile_money',
        supportedRegions: ['KE', 'TZ', 'UG', 'GH'],
        processingTime: '1-3 minutes',
        limits: {
          min: 10,
          max: 70000,
          currency: 'KES'
        }
      },
      {
        id: 'card',
        name: 'Credit/Debit Card',
        icon: '/images/payment-methods/card.png',
        type: 'card',
        supportedRegions: ['US', 'EU', 'UK', 'CA', 'AU', 'IN', 'BR'],
        processingTime: '5-15 minutes',
        limits: {
          min: 20,
          max: 50000,
          currency: 'USD'
        }
      },
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        icon: '/images/payment-methods/bank.png',
        type: 'bank_transfer',
        supportedRegions: ['US', 'EU', 'UK', 'CA', 'AU'],
        processingTime: '1-3 business days',
        limits: {
          min: 100,
          max: 100000,
          currency: 'USD'
        }
      },
      {
        id: 'pix',
        name: 'PIX',
        icon: '/images/payment-methods/pix.png',
        type: 'bank_transfer',
        supportedRegions: ['BR'],
        processingTime: '1-5 minutes',
        limits: {
          min: 1,
          max: 50000,
          currency: 'BRL'
        }
      }
    ];

    methods.forEach(method => {
      this.paymentMethods.set(method.id, method);
    });
  }

  async detectUserRegion(): Promise<string> {
    try {
      // Try to get user's location from IP
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      // Map country codes to our supported regions
      const countryToRegion: { [key: string]: string } = {
        'US': 'US',
        'IN': 'IN',
        'KE': 'KE',
        'TZ': 'KE', // Use Kenya config for Tanzania
        'UG': 'KE', // Use Kenya config for Uganda
        'GH': 'KE', // Use Kenya config for Ghana
        'ZA': 'KE', // Use Kenya config for South Africa
        'BR': 'BR',
        // EU countries
        'DE': 'EU', 'FR': 'EU', 'IT': 'EU', 'ES': 'EU', 'NL': 'EU',
        'BE': 'EU', 'AT': 'EU', 'PT': 'EU', 'IE': 'EU', 'FI': 'EU',
        'DK': 'EU', 'SE': 'EU', 'NO': 'EU', 'CH': 'EU', 'LU': 'EU'
      };

      return countryToRegion[data.country_code] || 'US';
    } catch (error) {
      console.error('Failed to detect region:', error);
      return 'US'; // Default to US
    }
  }

  getRegionConfig(regionCode: string): RegionConfig | null {
    return this.regions.get(regionCode) || null;
  }

  getAvailableProviders(regionCode: string): PaymentProvider[] {
    return Array.from(this.providers.values()).filter(provider =>
      provider.supportedRegions.includes(regionCode)
    );
  }

  getAvailablePaymentMethods(regionCode: string): PaymentMethod[] {
    return Array.from(this.paymentMethods.values()).filter(method =>
      method.supportedRegions.includes(regionCode)
    );
  }

  async getQuotes(
    fiatAmount: number,
    fiatCurrency: string,
    cryptoCurrency: string,
    regionCode: string
  ): Promise<PurchaseQuote[]> {
    const providers = this.getAvailableProviders(regionCode);
    const quotes: PurchaseQuote[] = [];

    for (const provider of providers) {
      if (!provider.supportedCurrencies.includes(fiatCurrency) ||
          !provider.supportedCryptos.includes(cryptoCurrency)) {
        continue;
      }

      try {
        const quote = await this.getProviderQuote(provider, fiatAmount, fiatCurrency, cryptoCurrency);
        quotes.push(quote);
      } catch (error) {
        console.error(`Failed to get quote from ${provider.name}:`, error);
      }
    }

    // Sort by total cost (including fees)
    return quotes.sort((a, b) => a.fees.total - b.fees.total);
  }

  private async getProviderQuote(
    provider: PaymentProvider,
    fiatAmount: number,
    fiatCurrency: string,
    cryptoCurrency: string
  ): Promise<PurchaseQuote> {
    // Mock exchange rate - in production, fetch from provider APIs
    const mockExchangeRates: { [key: string]: number } = {
      'ETH': 2000,
      'USDC': 1,
      'USDT': 1,
      'BTC': 45000,
      'MATIC': 0.8
    };

    const exchangeRate = mockExchangeRates[cryptoCurrency] || 1;
    const providerFee = (fiatAmount * provider.fees.percentage / 100) + provider.fees.fixed;
    const networkFee = cryptoCurrency === 'ETH' ? 10 : 2; // Mock network fees
    const platformFee = fiatAmount * 0.005; // 0.5% platform fee
    const totalFees = providerFee + networkFee + platformFee;
    const netAmount = fiatAmount - totalFees;
    const cryptoAmount = netAmount / exchangeRate;

    return {
      providerId: provider.id,
      fiatAmount,
      fiatCurrency,
      cryptoAmount,
      cryptoCurrency,
      exchangeRate,
      fees: {
        providerFee,
        networkFee,
        platformFee,
        total: totalFees
      },
      processingTime: provider.processingTime,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      paymentMethods: this.getProviderPaymentMethods(provider.id)
    };
  }

  private getProviderPaymentMethods(providerId: string): string[] {
    const methodMap: { [key: string]: string[] } = {
      'ramp': ['card', 'bank_transfer'],
      'moonpay': ['card', 'bank_transfer', 'sepa'],
      'razorpay': ['upi', 'card', 'netbanking'],
      'mpesa': ['mobile_money'],
      'transak': ['card', 'bank_transfer', 'sepa', 'pix']
    };

    return methodMap[providerId] || ['card'];
  }

  async initiatePurchase(
    quote: PurchaseQuote,
    paymentMethodId: string,
    userAddress: string
  ): Promise<{ redirectUrl?: string; transactionId: string }> {
    // Mock implementation - in production, integrate with actual provider APIs
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    switch (quote.providerId) {
      case 'ramp':
        return {
          redirectUrl: `https://buy.ramp.network/?hostApiKey=YOUR_API_KEY&userAddress=${userAddress}&fiatCurrency=${quote.fiatCurrency}&fiatValue=${quote.fiatAmount}&swapAsset=${quote.cryptoCurrency}`,
          transactionId
        };
      
      case 'moonpay':
        return {
          redirectUrl: `https://buy.moonpay.com/?apiKey=YOUR_API_KEY&walletAddress=${userAddress}&currencyCode=${quote.cryptoCurrency}&baseCurrencyAmount=${quote.fiatAmount}&baseCurrencyCode=${quote.fiatCurrency}`,
          transactionId
        };
      
      case 'razorpay':
        // For UPI, would integrate with Razorpay's payment gateway
        return {
          transactionId
        };
      
      case 'mpesa':
        // For M-Pesa, would integrate with mobile money APIs
        return {
          transactionId
        };
      
      default:
        throw new Error(`Provider ${quote.providerId} not implemented`);
    }
  }

  async getTransactionStatus(transactionId: string): Promise<{
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    txHash?: string;
    failureReason?: string;
  }> {
    // Mock implementation - in production, check with provider APIs
    return {
      status: 'pending'
    };
  }

  getOptimalProvider(
    quotes: PurchaseQuote[],
    regionCode: string,
    amount: number
  ): PurchaseQuote | null {
    if (quotes.length === 0) return null;

    const regionConfig = this.getRegionConfig(regionCode);
    if (!regionConfig) return quotes[0];

    // Apply region-specific optimization
    if (amount >= regionConfig.feeOptimization.bulkDiscountThreshold) {
      // For large amounts, prefer lowest total fees
      return quotes.reduce((best, current) => 
        current.fees.total < best.fees.total ? current : best
      );
    }

    if (amount <= regionConfig.feeOptimization.lowFeeThreshold) {
      // For small amounts, prefer fastest processing
      const fastProviders = quotes.filter(q => 
        parseInt(q.processingTime.split('-')[0]) <= 5
      );
      return fastProviders.length > 0 ? fastProviders[0] : quotes[0];
    }

    // For medium amounts, balance fees and speed
    return quotes[0]; // Already sorted by total cost
  }

  formatCurrency(amount: number, currency: string, regionCode: string): string {
    const regionConfig = this.getRegionConfig(regionCode);
    const locale = regionConfig?.language === 'pt' ? 'pt-BR' : 
                   regionConfig?.language === 'hi' ? 'hi-IN' : 'en-US';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  getKYCRequirements(regionCode: string, level: 1 | 2 | 3 = 2): string[] {
    const regionConfig = this.getRegionConfig(regionCode);
    if (!regionConfig) return ['email', 'phone', 'government_id'];

    const levelKey = `level${level}` as keyof typeof regionConfig.kycRequirements;
    return regionConfig.kycRequirements[levelKey] || [];
  }

  getOnboardingSteps(regionCode: string): OnboardingStep[] {
    const regionConfig = this.getRegionConfig(regionCode);
    const kycRequirements = this.getKYCRequirements(regionCode);

    const baseSteps: OnboardingStep[] = [
      {
        id: 'welcome',
        title: 'Welcome to OmniFlow',
        description: 'Get started with fractional RWA investments',
        component: 'WelcomeStep',
        required: true,
        estimatedTime: 2,
        dependencies: []
      },
      {
        id: 'region_selection',
        title: 'Select Your Region',
        description: 'Choose your country for localized experience',
        component: 'RegionSelectionStep',
        required: true,
        estimatedTime: 1,
        dependencies: ['welcome']
      },
      {
        id: 'wallet_setup',
        title: 'Connect Your Wallet',
        description: 'Connect or create a crypto wallet',
        component: 'WalletSetupStep',
        required: true,
        estimatedTime: 3,
        dependencies: ['region_selection']
      }
    ];

    // Add KYC steps based on region requirements
    if (kycRequirements.includes('email')) {
      baseSteps.push({
        id: 'email_verification',
        title: 'Verify Email',
        description: 'Confirm your email address',
        component: 'EmailVerificationStep',
        required: true,
        estimatedTime: 2,
        dependencies: ['wallet_setup']
      });
    }

    if (kycRequirements.includes('phone')) {
      baseSteps.push({
        id: 'phone_verification',
        title: 'Verify Phone',
        description: 'Confirm your phone number',
        component: 'PhoneVerificationStep',
        required: true,
        estimatedTime: 2,
        dependencies: ['email_verification']
      });
    }

    if (kycRequirements.includes('government_id') || kycRequirements.includes('aadhaar') || kycRequirements.includes('national_id')) {
      baseSteps.push({
        id: 'identity_verification',
        title: 'Identity Verification',
        description: 'Upload government-issued ID',
        component: 'IdentityVerificationStep',
        required: true,
        estimatedTime: 5,
        dependencies: ['phone_verification']
      });
    }

    baseSteps.push({
      id: 'payment_setup',
      title: 'Setup Payment Method',
      description: 'Add your preferred payment method',
      component: 'PaymentSetupStep',
      required: false,
      estimatedTime: 3,
      dependencies: ['identity_verification']
    });

    baseSteps.push({
      id: 'completion',
      title: 'Welcome to OmniFlow!',
      description: 'Your account is ready for RWA investments',
      component: 'CompletionStep',
      required: true,
      estimatedTime: 1,
      dependencies: ['payment_setup']
    });

    return baseSteps;
  }
}

export const paymentService = new PaymentService();
