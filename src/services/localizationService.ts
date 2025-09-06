export interface Translation {
  [key: string]: string | Translation;
}

export interface LocaleConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
  dateFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
    currency: {
      symbol: string;
      position: 'before' | 'after';
    };
  };
}

export interface RegionLocalization {
  locale: string;
  currency: string;
  timezone: string;
  paymentMethods: string[];
  kycRequirements: string[];
  legalNotices: {
    terms: string;
    privacy: string;
    compliance: string;
  };
}

class LocalizationService {
  private translations: Map<string, Translation> = new Map();
  private locales: Map<string, LocaleConfig> = new Map();
  private regionLocalizations: Map<string, RegionLocalization> = new Map();
  private currentLocale: string = 'en';

  constructor() {
    this.initializeLocales();
    this.initializeTranslations();
    this.initializeRegionLocalizations();
  }

  private initializeLocales() {
    const locales: LocaleConfig[] = [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '🇺🇸',
        rtl: false,
        dateFormat: 'MM/DD/YYYY',
        numberFormat: {
          decimal: '.',
          thousands: ',',
          currency: {
            symbol: '$',
            position: 'before'
          }
        }
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        flag: '🇪🇸',
        rtl: false,
        dateFormat: 'DD/MM/YYYY',
        numberFormat: {
          decimal: ',',
          thousands: '.',
          currency: {
            symbol: '€',
            position: 'after'
          }
        }
      },
      {
        code: 'pt',
        name: 'Portuguese',
        nativeName: 'Português',
        flag: '🇧🇷',
        rtl: false,
        dateFormat: 'DD/MM/YYYY',
        numberFormat: {
          decimal: ',',
          thousands: '.',
          currency: {
            symbol: 'R$',
            position: 'before'
          }
        }
      },
      {
        code: 'hi',
        name: 'Hindi',
        nativeName: 'हिन्दी',
        flag: '🇮🇳',
        rtl: false,
        dateFormat: 'DD/MM/YYYY',
        numberFormat: {
          decimal: '.',
          thousands: ',',
          currency: {
            symbol: '₹',
            position: 'before'
          }
        }
      },
      {
        code: 'sw',
        name: 'Swahili',
        nativeName: 'Kiswahili',
        flag: '🇰🇪',
        rtl: false,
        dateFormat: 'DD/MM/YYYY',
        numberFormat: {
          decimal: '.',
          thousands: ',',
          currency: {
            symbol: 'KSh',
            position: 'before'
          }
        }
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        flag: '🇫🇷',
        rtl: false,
        dateFormat: 'DD/MM/YYYY',
        numberFormat: {
          decimal: ',',
          thousands: ' ',
          currency: {
            symbol: '€',
            position: 'after'
          }
        }
      },
      {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        flag: '🇩🇪',
        rtl: false,
        dateFormat: 'DD.MM.YYYY',
        numberFormat: {
          decimal: ',',
          thousands: '.',
          currency: {
            symbol: '€',
            position: 'after'
          }
        }
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        flag: '🇸🇦',
        rtl: true,
        dateFormat: 'DD/MM/YYYY',
        numberFormat: {
          decimal: '.',
          thousands: ',',
          currency: {
            symbol: '$',
            position: 'before'
          }
        }
      }
    ];

    locales.forEach(locale => {
      this.locales.set(locale.code, locale);
    });
  }

  private initializeTranslations() {
    // English translations (base)
    const enTranslations: Translation = {
      common: {
        welcome: 'Welcome',
        continue: 'Continue',
        back: 'Back',
        next: 'Next',
        cancel: 'Cancel',
        confirm: 'Confirm',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        retry: 'Retry',
        close: 'Close',
        save: 'Save',
        edit: 'Edit',
        delete: 'Delete',
        view: 'View',
        copy: 'Copy',
        copied: 'Copied!',
        select: 'Select',
        search: 'Search',
        filter: 'Filter',
        sort: 'Sort',
        amount: 'Amount',
        currency: 'Currency',
        fee: 'Fee',
        total: 'Total',
        balance: 'Balance',
        address: 'Address',
        transaction: 'Transaction',
        status: 'Status',
        pending: 'Pending',
        completed: 'Completed',
        failed: 'Failed',
        processing: 'Processing'
      },
      onboarding: {
        title: 'Welcome to OmniFlow',
        subtitle: 'Your gateway to fractional Real World Asset investments',
        getStarted: 'Get Started',
        selectRegion: 'Select Your Region',
        regionDescription: 'Choose your country for a localized experience',
        connectWallet: 'Connect Your Wallet',
        walletDescription: 'Connect or create a crypto wallet to get started',
        verifyEmail: 'Verify Your Email',
        emailDescription: 'We\'ll send you a verification code',
        verifyPhone: 'Verify Your Phone',
        phoneDescription: 'Enter your phone number for security',
        identityVerification: 'Identity Verification',
        identityDescription: 'Upload a government-issued ID for compliance',
        paymentSetup: 'Setup Payment Method',
        paymentDescription: 'Add your preferred payment method for easy investing',
        completion: 'Welcome to OmniFlow!',
        completionDescription: 'Your account is ready for RWA investments',
        estimatedTime: 'Estimated time: {{time}} minutes',
        step: 'Step {{current}} of {{total}}',
        skipForNow: 'Skip for now',
        required: 'Required',
        optional: 'Optional'
      },
      kyc: {
        title: 'Identity Verification',
        subtitle: 'Complete KYC to unlock full platform features',
        level1: 'Basic Verification',
        level2: 'Standard Verification',
        level3: 'Enhanced Verification',
        uploadDocument: 'Upload Document',
        documentTypes: {
          passport: 'Passport',
          nationalId: 'National ID',
          driversLicense: 'Driver\'s License',
          utilityBill: 'Utility Bill',
          bankStatement: 'Bank Statement',
          aadhaar: 'Aadhaar Card',
          pan: 'PAN Card',
          ssn: 'Social Security Number',
          cpf: 'CPF',
          rg: 'RG'
        },
        requirements: {
          email: 'Email verification',
          phone: 'Phone verification',
          governmentId: 'Government-issued ID',
          addressProof: 'Proof of address',
          incomeVerification: 'Income verification',
          sourceOfFunds: 'Source of funds declaration'
        },
        status: {
          notStarted: 'Not Started',
          inProgress: 'In Progress',
          underReview: 'Under Review',
          approved: 'Approved',
          rejected: 'Rejected'
        },
        tips: {
          clearPhoto: 'Ensure the photo is clear and well-lit',
          fullDocument: 'Capture the entire document',
          noGlare: 'Avoid glare and shadows',
          validDocument: 'Use a valid, unexpired document'
        }
      },
      payments: {
        title: 'Buy Crypto',
        subtitle: 'Purchase cryptocurrency to start investing in RWAs',
        selectAmount: 'Select Amount',
        selectCurrency: 'Select Currency',
        selectPaymentMethod: 'Select Payment Method',
        paymentMethods: {
          card: 'Credit/Debit Card',
          bankTransfer: 'Bank Transfer',
          upi: 'UPI',
          mobileMoney: 'Mobile Money',
          mpesa: 'M-Pesa',
          pix: 'PIX',
          sepa: 'SEPA Transfer',
          ach: 'ACH Transfer',
          wire: 'Wire Transfer'
        },
        providers: {
          ramp: 'Ramp Network',
          moonpay: 'MoonPay',
          transak: 'Transak',
          razorpay: 'Razorpay',
          mpesa: 'M-Pesa Gateway'
        },
        quote: {
          youPay: 'You Pay',
          youReceive: 'You Receive',
          exchangeRate: 'Exchange Rate',
          processingTime: 'Processing Time',
          fees: 'Fees',
          providerFee: 'Provider Fee',
          networkFee: 'Network Fee',
          platformFee: 'Platform Fee',
          totalFees: 'Total Fees',
          expiresIn: 'Quote expires in',
          minutes: 'minutes'
        },
        limits: {
          minimum: 'Minimum',
          maximum: 'Maximum',
          daily: 'Daily limit',
          monthly: 'Monthly limit'
        },
        status: {
          initiated: 'Payment Initiated',
          processing: 'Processing Payment',
          completed: 'Payment Completed',
          failed: 'Payment Failed',
          cancelled: 'Payment Cancelled'
        }
      },
      dashboard: {
        title: 'Dashboard',
        portfolio: 'Portfolio',
        totalValue: 'Total Portfolio Value',
        totalInvested: 'Total Invested',
        totalReturns: 'Total Returns',
        assets: 'Assets',
        transactions: 'Recent Transactions',
        performance: 'Performance',
        allocation: 'Asset Allocation',
        recentActivity: 'Recent Activity'
      },
      assets: {
        title: 'Assets',
        realEstate: 'Real Estate',
        carbonCredits: 'Carbon Credits',
        preciousMetals: 'Precious Metals',
        commodities: 'Commodities',
        bonds: 'Bonds',
        stocks: 'Stocks',
        intellectualProperty: 'Intellectual Property',
        renewableEnergy: 'Renewable Energy',
        viewDetails: 'View Details',
        invest: 'Invest',
        performance: 'Performance',
        dividends: 'Dividends',
        ownership: 'Ownership'
      },
      governance: {
        title: 'Governance',
        proposals: 'Proposals',
        voting: 'Voting',
        createProposal: 'Create Proposal',
        voteFor: 'Vote For',
        voteAgainst: 'Vote Against',
        abstain: 'Abstain',
        quorum: 'Quorum',
        votingPower: 'Voting Power',
        proposalTypes: {
          valuationUpdate: 'Valuation Update',
          assetLiquidation: 'Asset Liquidation',
          yieldDistribution: 'Yield Distribution',
          governanceParameter: 'Governance Parameter',
          emergencyAction: 'Emergency Action'
        }
      },
      errors: {
        networkError: 'Network error. Please check your connection.',
        invalidAmount: 'Please enter a valid amount',
        insufficientBalance: 'Insufficient balance',
        transactionFailed: 'Transaction failed',
        kycRequired: 'KYC verification required',
        regionNotSupported: 'Your region is not currently supported',
        paymentMethodNotAvailable: 'Payment method not available in your region',
        quoteFailed: 'Failed to get quote. Please try again.',
        documentUploadFailed: 'Document upload failed. Please try again.',
        verificationFailed: 'Verification failed. Please check your details.'
      }
    };

    // Spanish translations
    const esTranslations: Translation = {
      common: {
        welcome: 'Bienvenido',
        continue: 'Continuar',
        back: 'Atrás',
        next: 'Siguiente',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        loading: 'Cargando...',
        error: 'Error',
        success: 'Éxito',
        retry: 'Reintentar',
        close: 'Cerrar',
        save: 'Guardar',
        edit: 'Editar',
        delete: 'Eliminar',
        view: 'Ver',
        copy: 'Copiar',
        copied: '¡Copiado!',
        select: 'Seleccionar',
        search: 'Buscar',
        filter: 'Filtrar',
        sort: 'Ordenar',
        amount: 'Cantidad',
        currency: 'Moneda',
        fee: 'Tarifa',
        total: 'Total',
        balance: 'Saldo',
        address: 'Dirección',
        transaction: 'Transacción',
        status: 'Estado',
        pending: 'Pendiente',
        completed: 'Completado',
        failed: 'Fallido',
        processing: 'Procesando'
      },
      onboarding: {
        title: 'Bienvenido a OmniFlow',
        subtitle: 'Tu puerta de entrada a inversiones fraccionarias en activos del mundo real',
        getStarted: 'Comenzar',
        selectRegion: 'Selecciona tu región',
        regionDescription: 'Elige tu país para una experiencia localizada',
        connectWallet: 'Conecta tu billetera',
        walletDescription: 'Conecta o crea una billetera cripto para comenzar'
      }
    };

    // Portuguese translations
    const ptTranslations: Translation = {
      common: {
        welcome: 'Bem-vindo',
        continue: 'Continuar',
        back: 'Voltar',
        next: 'Próximo',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        loading: 'Carregando...',
        error: 'Erro',
        success: 'Sucesso',
        retry: 'Tentar novamente',
        close: 'Fechar',
        save: 'Salvar',
        edit: 'Editar',
        delete: 'Excluir',
        view: 'Ver',
        copy: 'Copiar',
        copied: 'Copiado!',
        select: 'Selecionar',
        search: 'Buscar',
        filter: 'Filtrar',
        sort: 'Ordenar',
        amount: 'Quantia',
        currency: 'Moeda',
        fee: 'Taxa',
        total: 'Total',
        balance: 'Saldo',
        address: 'Endereço',
        transaction: 'Transação',
        status: 'Status',
        pending: 'Pendente',
        completed: 'Concluído',
        failed: 'Falhou',
        processing: 'Processando'
      },
      onboarding: {
        title: 'Bem-vindo ao OmniFlow',
        subtitle: 'Sua porta de entrada para investimentos fracionários em ativos do mundo real',
        getStarted: 'Começar',
        selectRegion: 'Selecione sua região',
        regionDescription: 'Escolha seu país para uma experiência localizada',
        connectWallet: 'Conecte sua carteira',
        walletDescription: 'Conecte ou crie uma carteira cripto para começar'
      }
    };

    // Hindi translations
    const hiTranslations: Translation = {
      common: {
        welcome: 'स्वागत है',
        continue: 'जारी रखें',
        back: 'वापस',
        next: 'अगला',
        cancel: 'रद्द करें',
        confirm: 'पुष्टि करें',
        loading: 'लोड हो रहा है...',
        error: 'त्रुटि',
        success: 'सफलता',
        retry: 'पुनः प्रयास करें',
        close: 'बंद करें',
        save: 'सहेजें',
        edit: 'संपादित करें',
        delete: 'हटाएं',
        view: 'देखें',
        copy: 'कॉपी करें',
        copied: 'कॉपी हो गया!',
        select: 'चुनें',
        search: 'खोजें',
        filter: 'फिल्टर',
        sort: 'क्रमबद्ध करें',
        amount: 'राशि',
        currency: 'मुद्रा',
        fee: 'शुल्क',
        total: 'कुल',
        balance: 'शेष राशि',
        address: 'पता',
        transaction: 'लेनदेन',
        status: 'स्थिति',
        pending: 'लंबित',
        completed: 'पूर्ण',
        failed: 'असफल',
        processing: 'प्रसंस्करण'
      },
      onboarding: {
        title: 'OmniFlow में आपका स्वागत है',
        subtitle: 'वास्तविक संपत्ति के आंशिक निवेश का आपका प्रवेश द्वार',
        getStarted: 'शुरू करें',
        selectRegion: 'अपना क्षेत्र चुनें',
        regionDescription: 'स्थानीयकृत अनुभव के लिए अपना देश चुनें',
        connectWallet: 'अपना वॉलेट कनेक्ट करें',
        walletDescription: 'शुरू करने के लिए एक क्रिप्टो वॉलेट कनेक्ट या बनाएं'
      }
    };

    this.translations.set('en', enTranslations);
    this.translations.set('es', esTranslations);
    this.translations.set('pt', ptTranslations);
    this.translations.set('hi', hiTranslations);
  }

  private initializeRegionLocalizations() {
    const regionalizations: RegionLocalization[] = [
      {
        locale: 'en',
        currency: 'USD',
        timezone: 'America/New_York',
        paymentMethods: ['card', 'bank_transfer', 'ach'],
        kycRequirements: ['email', 'phone', 'government_id', 'address_proof'],
        legalNotices: {
          terms: '/legal/terms-us.html',
          privacy: '/legal/privacy-us.html',
          compliance: '/legal/compliance-us.html'
        }
      },
      {
        locale: 'hi',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        paymentMethods: ['upi', 'card', 'netbanking'],
        kycRequirements: ['email', 'phone', 'aadhaar', 'pan'],
        legalNotices: {
          terms: '/legal/terms-in.html',
          privacy: '/legal/privacy-in.html',
          compliance: '/legal/compliance-in.html'
        }
      },
      {
        locale: 'sw',
        currency: 'KES',
        timezone: 'Africa/Nairobi',
        paymentMethods: ['mobile_money', 'card'],
        kycRequirements: ['email', 'phone', 'national_id'],
        legalNotices: {
          terms: '/legal/terms-ke.html',
          privacy: '/legal/privacy-ke.html',
          compliance: '/legal/compliance-ke.html'
        }
      },
      {
        locale: 'pt',
        currency: 'BRL',
        timezone: 'America/Sao_Paulo',
        paymentMethods: ['pix', 'card', 'bank_transfer'],
        kycRequirements: ['email', 'phone', 'cpf', 'rg'],
        legalNotices: {
          terms: '/legal/terms-br.html',
          privacy: '/legal/privacy-br.html',
          compliance: '/legal/compliance-br.html'
        }
      }
    ];

    regionalizations.forEach((regionalization, index) => {
      const regionCodes = ['US', 'IN', 'KE', 'BR'];
      this.regionLocalizations.set(regionCodes[index], regionalization);
    });
  }

  setLocale(locale: string): void {
    if (this.locales.has(locale)) {
      this.currentLocale = locale;
      
      // Update document language and direction
      if (typeof document !== 'undefined') {
        document.documentElement.lang = locale;
        const localeConfig = this.locales.get(locale);
        if (localeConfig) {
          document.documentElement.dir = localeConfig.rtl ? 'rtl' : 'ltr';
        }
      }
    }
  }

  getCurrentLocale(): string {
    return this.currentLocale;
  }

  getAvailableLocales(): LocaleConfig[] {
    return Array.from(this.locales.values());
  }

  getLocaleConfig(locale: string): LocaleConfig | null {
    return this.locales.get(locale) || null;
  }

  translate(key: string, params?: { [key: string]: string | number }): string {
    const translations = this.translations.get(this.currentLocale) || this.translations.get('en');
    if (!translations) return key;

    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    if (typeof value !== 'string') return key;

    // Replace parameters
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match;
      });
    }

    return value;
  }

  // Shorthand for translate
  t(key: string, params?: { [key: string]: string | number }): string {
    return this.translate(key, params);
  }

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    const localeConfig = this.locales.get(this.currentLocale);
    const locale = localeConfig ? this.getIntlLocale(this.currentLocale) : 'en-US';
    
    return new Intl.NumberFormat(locale, options).format(value);
  }

  formatCurrency(value: number, currency?: string): string {
    const localeConfig = this.locales.get(this.currentLocale);
    const locale = localeConfig ? this.getIntlLocale(this.currentLocale) : 'en-US';
    const currencyCode = currency || localeConfig?.numberFormat.currency.symbol || 'USD';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode
    }).format(value);
  }

  formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    const localeConfig = this.locales.get(this.currentLocale);
    const locale = localeConfig ? this.getIntlLocale(this.currentLocale) : 'en-US';
    
    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  formatRelativeTime(date: Date): string {
    const localeConfig = this.locales.get(this.currentLocale);
    const locale = localeConfig ? this.getIntlLocale(this.currentLocale) : 'en-US';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    
    if (diffInSeconds < 60) {
      return rtf.format(-diffInSeconds, 'second');
    } else if (diffInSeconds < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    } else if (diffInSeconds < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    } else {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    }
  }

  private getIntlLocale(locale: string): string {
    const localeMap: { [key: string]: string } = {
      'en': 'en-US',
      'es': 'es-ES',
      'pt': 'pt-BR',
      'hi': 'hi-IN',
      'sw': 'sw-KE',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'ar': 'ar-SA'
    };
    
    return localeMap[locale] || 'en-US';
  }

  detectBrowserLocale(): string {
    if (typeof navigator === 'undefined') return 'en';
    
    const browserLocale = navigator.language || 'en';
    const localeCode = browserLocale.split('-')[0];
    
    return this.locales.has(localeCode) ? localeCode : 'en';
  }

  getRegionLocalization(regionCode: string): RegionLocalization | null {
    return this.regionLocalizations.get(regionCode) || null;
  }

  getLocalizedPaymentMethods(regionCode: string): string[] {
    const regionalization = this.getRegionLocalization(regionCode);
    return regionalization?.paymentMethods || [];
  }

  getLocalizedKYCRequirements(regionCode: string): string[] {
    const regionalization = this.getRegionLocalization(regionCode);
    return regionalization?.kycRequirements || [];
  }

  getLocalizedLegalNotices(regionCode: string): { terms: string; privacy: string; compliance: string } {
    const regionalization = this.getRegionLocalization(regionCode);
    return regionalization?.legalNotices || {
      terms: '/legal/terms.html',
      privacy: '/legal/privacy.html',
      compliance: '/legal/compliance.html'
    };
  }

  isRTL(): boolean {
    const localeConfig = this.locales.get(this.currentLocale);
    return localeConfig?.rtl || false;
  }

  getDateFormat(): string {
    const localeConfig = this.locales.get(this.currentLocale);
    return localeConfig?.dateFormat || 'MM/DD/YYYY';
  }

  getNumberFormat(): { decimal: string; thousands: string } {
    const localeConfig = this.locales.get(this.currentLocale);
    return localeConfig?.numberFormat || { decimal: '.', thousands: ',' };
  }

  getCurrencyFormat(): { symbol: string; position: 'before' | 'after' } {
    const localeConfig = this.locales.get(this.currentLocale);
    return localeConfig?.numberFormat.currency || { symbol: '$', position: 'before' };
  }
}

export const localizationService = new LocalizationService();
