export interface KYCDocument {
  id: string;
  type: 'passport' | 'national_id' | 'drivers_license' | 'utility_bill' | 'bank_statement' | 'aadhaar' | 'pan' | 'cpf' | 'rg' | 'ssn';
  file: File | null;
  url?: string;
  status: 'pending' | 'uploaded' | 'processing' | 'approved' | 'rejected';
  rejectionReason?: string;
  uploadedAt?: Date;
  processedAt?: Date;
  expiryDate?: Date;
  metadata?: {
    documentNumber?: string;
    issuingAuthority?: string;
    issuedDate?: Date;
  };
}

export interface KYCLevel {
  level: 1 | 2 | 3;
  name: string;
  description: string;
  requirements: string[];
  benefits: string[];
  limits: {
    daily: number;
    monthly: number;
    annual: number;
    currency: string;
  };
  processingTime: string;
}

export interface KYCProfile {
  userId: string;
  currentLevel: 1 | 2 | 3;
  targetLevel?: 1 | 2 | 3;
  status: 'not_started' | 'in_progress' | 'under_review' | 'approved' | 'rejected' | 'expired';
  regionCode: string;
  personalInfo: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    nationality?: string;
    phoneNumber?: string;
    email?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  documents: KYCDocument[];
  verificationSteps: {
    email: boolean;
    phone: boolean;
    identity: boolean;
    address: boolean;
    income: boolean;
    sourceOfFunds: boolean;
  };
  riskScore?: number;
  lastUpdated: Date;
  expiryDate?: Date;
  notes?: string[];
}

export interface RegionKYCConfig {
  regionCode: string;
  levels: KYCLevel[];
  requiredDocuments: {
    [level: number]: string[];
  };
  optionalDocuments: {
    [level: number]: string[];
  };
  documentAlternatives: {
    [documentType: string]: string[];
  };
  processingTimes: {
    [level: number]: string;
  };
  complianceFramework: string;
  regulatoryAuthority: string;
  dataRetentionPeriod: number; // in months
}

class KYCService {
  private regionConfigs: Map<string, RegionKYCConfig> = new Map();
  private documentValidators: Map<string, (doc: KYCDocument) => Promise<boolean>> = new Map();

  constructor() {
    this.initializeRegionConfigs();
    this.initializeDocumentValidators();
  }

  private initializeRegionConfigs() {
    const configs: RegionKYCConfig[] = [
      {
        regionCode: 'US',
        levels: [
          {
            level: 1,
            name: 'Basic Verification',
            description: 'Email and phone verification',
            requirements: ['email', 'phone'],
            benefits: ['Basic trading', 'Portfolio viewing'],
            limits: {
              daily: 1000,
              monthly: 5000,
              annual: 25000,
              currency: 'USD'
            },
            processingTime: 'Instant'
          },
          {
            level: 2,
            name: 'Standard Verification',
            description: 'Identity and address verification',
            requirements: ['email', 'phone', 'government_id', 'address_proof'],
            benefits: ['Higher limits', 'Governance participation', 'Dividend claiming'],
            limits: {
              daily: 10000,
              monthly: 50000,
              annual: 250000,
              currency: 'USD'
            },
            processingTime: '1-3 business days'
          },
          {
            level: 3,
            name: 'Enhanced Verification',
            description: 'Full compliance verification',
            requirements: ['email', 'phone', 'government_id', 'address_proof', 'ssn', 'income_verification'],
            benefits: ['Maximum limits', 'Institutional features', 'Priority support'],
            limits: {
              daily: 100000,
              monthly: 500000,
              annual: 2500000,
              currency: 'USD'
            },
            processingTime: '3-7 business days'
          }
        ],
        requiredDocuments: {
          1: [],
          2: ['drivers_license', 'utility_bill'],
          3: ['passport', 'bank_statement', 'tax_return']
        },
        optionalDocuments: {
          1: [],
          2: ['passport', 'national_id'],
          3: ['employment_letter', 'investment_statement']
        },
        documentAlternatives: {
          'drivers_license': ['passport', 'national_id', 'state_id'],
          'utility_bill': ['bank_statement', 'lease_agreement', 'insurance_statement']
        },
        processingTimes: {
          1: 'Instant',
          2: '1-3 business days',
          3: '3-7 business days'
        },
        complianceFramework: 'US BSA/AML',
        regulatoryAuthority: 'FinCEN',
        dataRetentionPeriod: 84 // 7 years
      },
      {
        regionCode: 'IN',
        levels: [
          {
            level: 1,
            name: 'Basic Verification',
            description: 'Email and phone verification',
            requirements: ['email', 'phone'],
            benefits: ['Basic trading up to ₹50,000'],
            limits: {
              daily: 50000,
              monthly: 200000,
              annual: 1000000,
              currency: 'INR'
            },
            processingTime: 'Instant'
          },
          {
            level: 2,
            name: 'Standard Verification',
            description: 'Aadhaar and PAN verification',
            requirements: ['email', 'phone', 'aadhaar', 'pan'],
            benefits: ['Higher limits', 'UPI payments', 'Governance participation'],
            limits: {
              daily: 500000,
              monthly: 2000000,
              annual: 10000000,
              currency: 'INR'
            },
            processingTime: '1-2 business days'
          },
          {
            level: 3,
            name: 'Enhanced Verification',
            description: 'Full KYC with income proof',
            requirements: ['email', 'phone', 'aadhaar', 'pan', 'bank_statement', 'income_proof'],
            benefits: ['Maximum limits', 'International transfers'],
            limits: {
              daily: 2000000,
              monthly: 10000000,
              annual: 50000000,
              currency: 'INR'
            },
            processingTime: '2-5 business days'
          }
        ],
        requiredDocuments: {
          1: [],
          2: ['aadhaar', 'pan'],
          3: ['bank_statement', 'salary_slip']
        },
        optionalDocuments: {
          1: [],
          2: ['passport', 'voters_id'],
          3: ['itr', 'form16']
        },
        documentAlternatives: {
          'aadhaar': ['passport', 'voters_id', 'drivers_license'],
          'pan': ['form60'],
          'bank_statement': ['passbook', 'salary_slip']
        },
        processingTimes: {
          1: 'Instant',
          2: '1-2 business days',
          3: '2-5 business days'
        },
        complianceFramework: 'RBI KYC Guidelines',
        regulatoryAuthority: 'Reserve Bank of India',
        dataRetentionPeriod: 96 // 8 years
      },
      {
        regionCode: 'KE',
        levels: [
          {
            level: 1,
            name: 'Basic Verification',
            description: 'Email and phone verification',
            requirements: ['email', 'phone'],
            benefits: ['M-Pesa payments', 'Basic trading'],
            limits: {
              daily: 50000,
              monthly: 200000,
              annual: 1000000,
              currency: 'KES'
            },
            processingTime: 'Instant'
          },
          {
            level: 2,
            name: 'Standard Verification',
            description: 'National ID verification',
            requirements: ['email', 'phone', 'national_id'],
            benefits: ['Higher limits', 'Mobile money integration'],
            limits: {
              daily: 200000,
              monthly: 1000000,
              annual: 5000000,
              currency: 'KES'
            },
            processingTime: '1-2 business days'
          },
          {
            level: 3,
            name: 'Enhanced Verification',
            description: 'Full documentation',
            requirements: ['email', 'phone', 'national_id', 'utility_bill', 'bank_statement'],
            benefits: ['Maximum limits', 'International transfers'],
            limits: {
              daily: 1000000,
              monthly: 5000000,
              annual: 25000000,
              currency: 'KES'
            },
            processingTime: '3-5 business days'
          }
        ],
        requiredDocuments: {
          1: [],
          2: ['national_id'],
          3: ['utility_bill', 'bank_statement']
        },
        optionalDocuments: {
          1: [],
          2: ['passport', 'drivers_license'],
          3: ['employment_letter', 'business_permit']
        },
        documentAlternatives: {
          'national_id': ['passport', 'alien_id'],
          'utility_bill': ['bank_statement', 'rent_receipt']
        },
        processingTimes: {
          1: 'Instant',
          2: '1-2 business days',
          3: '3-5 business days'
        },
        complianceFramework: 'CBK AML Guidelines',
        regulatoryAuthority: 'Central Bank of Kenya',
        dataRetentionPeriod: 60 // 5 years
      },
      {
        regionCode: 'BR',
        levels: [
          {
            level: 1,
            name: 'Verificação Básica',
            description: 'Verificação de email e telefone',
            requirements: ['email', 'phone'],
            benefits: ['PIX payments', 'Trading básico'],
            limits: {
              daily: 5000,
              monthly: 20000,
              annual: 100000,
              currency: 'BRL'
            },
            processingTime: 'Instantâneo'
          },
          {
            level: 2,
            name: 'Verificação Padrão',
            description: 'CPF e RG verification',
            requirements: ['email', 'phone', 'cpf', 'rg'],
            benefits: ['Limites maiores', 'Participação em governança'],
            limits: {
              daily: 50000,
              monthly: 200000,
              annual: 1000000,
              currency: 'BRL'
            },
            processingTime: '1-3 dias úteis'
          },
          {
            level: 3,
            name: 'Verificação Completa',
            description: 'Documentação completa',
            requirements: ['email', 'phone', 'cpf', 'rg', 'bank_statement', 'income_proof'],
            benefits: ['Limites máximos', 'Transferências internacionais'],
            limits: {
              daily: 200000,
              monthly: 1000000,
              annual: 5000000,
              currency: 'BRL'
            },
            processingTime: '3-7 dias úteis'
          }
        ],
        requiredDocuments: {
          1: [],
          2: ['cpf', 'rg'],
          3: ['bank_statement', 'comprovante_renda']
        },
        optionalDocuments: {
          1: [],
          2: ['passport', 'cnh'],
          3: ['declaracao_ir', 'contracheque']
        },
        documentAlternatives: {
          'rg': ['passport', 'cnh', 'carteira_trabalho'],
          'bank_statement': ['extrato_bancario', 'comprovante_renda']
        },
        processingTimes: {
          1: 'Instantâneo',
          2: '1-3 dias úteis',
          3: '3-7 dias úteis'
        },
        complianceFramework: 'BACEN AML',
        regulatoryAuthority: 'Banco Central do Brasil',
        dataRetentionPeriod: 60 // 5 years
      }
    ];

    configs.forEach(config => {
      this.regionConfigs.set(config.regionCode, config);
    });
  }

  private initializeDocumentValidators() {
    // Document validation functions
    this.documentValidators.set('passport', this.validatePassport);
    this.documentValidators.set('national_id', this.validateNationalId);
    this.documentValidators.set('drivers_license', this.validateDriversLicense);
    this.documentValidators.set('aadhaar', this.validateAadhaar);
    this.documentValidators.set('pan', this.validatePAN);
    this.documentValidators.set('cpf', this.validateCPF);
    this.documentValidators.set('utility_bill', this.validateUtilityBill);
    this.documentValidators.set('bank_statement', this.validateBankStatement);
  }

  async validatePassport(document: KYCDocument): Promise<boolean> {
    // Mock validation - in production, use OCR and government APIs
    if (!document.file) return false;
    
    // Check file size and type
    if (document.file.size > 10 * 1024 * 1024) return false; // 10MB limit
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(document.file.type)) return false;
    
    // In production, would use OCR to extract and validate passport data
    return true;
  }

  async validateNationalId(document: KYCDocument): Promise<boolean> {
    if (!document.file) return false;
    
    // Basic file validation
    if (document.file.size > 10 * 1024 * 1024) return false;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(document.file.type)) return false;
    
    return true;
  }

  async validateDriversLicense(document: KYCDocument): Promise<boolean> {
    if (!document.file) return false;
    
    // Basic validation
    if (document.file.size > 10 * 1024 * 1024) return false;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(document.file.type)) return false;
    
    return true;
  }

  async validateAadhaar(document: KYCDocument): Promise<boolean> {
    if (!document.file) return false;
    
    // Aadhaar-specific validation
    if (document.file.size > 10 * 1024 * 1024) return false;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(document.file.type)) return false;
    
    // In production, would validate Aadhaar number format and use UIDAI APIs
    return true;
  }

  async validatePAN(document: KYCDocument): Promise<boolean> {
    if (!document.file) return false;
    
    // PAN card validation
    if (document.file.size > 5 * 1024 * 1024) return false;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(document.file.type)) return false;
    
    return true;
  }

  async validateCPF(document: KYCDocument): Promise<boolean> {
    if (!document.file) return false;
    
    // CPF validation
    if (document.file.size > 5 * 1024 * 1024) return false;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(document.file.type)) return false;
    
    return true;
  }

  async validateUtilityBill(document: KYCDocument): Promise<boolean> {
    if (!document.file) return false;
    
    // Utility bill validation
    if (document.file.size > 15 * 1024 * 1024) return false;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(document.file.type)) return false;
    
    // Check if bill is recent (within 3 months)
    // In production, would extract date from document
    return true;
  }

  async validateBankStatement(document: KYCDocument): Promise<boolean> {
    if (!document.file) return false;
    
    // Bank statement validation
    if (document.file.size > 20 * 1024 * 1024) return false;
    if (!['application/pdf'].includes(document.file.type)) return false;
    
    return true;
  }

  getRegionConfig(regionCode: string): RegionKYCConfig | null {
    return this.regionConfigs.get(regionCode) || null;
  }

  getKYCLevels(regionCode: string): KYCLevel[] {
    const config = this.getRegionConfig(regionCode);
    return config?.levels || [];
  }

  getRequiredDocuments(regionCode: string, level: 1 | 2 | 3): string[] {
    const config = this.getRegionConfig(regionCode);
    return config?.requiredDocuments[level] || [];
  }

  getOptionalDocuments(regionCode: string, level: 1 | 2 | 3): string[] {
    const config = this.getRegionConfig(regionCode);
    return config?.optionalDocuments[level] || [];
  }

  getDocumentAlternatives(regionCode: string, documentType: string): string[] {
    const config = this.getRegionConfig(regionCode);
    return config?.documentAlternatives[documentType] || [];
  }

  async uploadDocument(
    userId: string,
    documentType: string,
    file: File,
    metadata?: any
  ): Promise<KYCDocument> {
    // Mock upload - in production, upload to secure storage
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const document: KYCDocument = {
      id: documentId,
      type: documentType as any,
      file,
      status: 'uploaded',
      uploadedAt: new Date(),
      metadata
    };

    // Validate document
    const validator = this.documentValidators.get(documentType);
    if (validator) {
      const isValid = await validator(document);
      if (!isValid) {
        document.status = 'rejected';
        document.rejectionReason = 'Document validation failed';
      }
    }

    return document;
  }

  async processKYCLevel(
    userId: string,
    regionCode: string,
    targetLevel: 1 | 2 | 3,
    documents: KYCDocument[]
  ): Promise<{ success: boolean; message: string; estimatedProcessingTime?: string }> {
    const config = this.getRegionConfig(regionCode);
    if (!config) {
      return { success: false, message: 'Region not supported' };
    }

    const requiredDocs = this.getRequiredDocuments(regionCode, targetLevel);
    const uploadedDocTypes = documents.map(doc => doc.type);

    // Check if all required documents are uploaded
    const missingDocs = requiredDocs.filter(docType => !uploadedDocTypes.includes(docType));
    if (missingDocs.length > 0) {
      return {
        success: false,
        message: `Missing required documents: ${missingDocs.join(', ')}`
      };
    }

    // Check if all documents are valid
    const invalidDocs = documents.filter(doc => doc.status === 'rejected');
    if (invalidDocs.length > 0) {
      return {
        success: false,
        message: 'Some documents were rejected. Please re-upload valid documents.'
      };
    }

    // Mock processing - in production, submit to compliance team
    const processingTime = config.processingTimes[targetLevel];
    
    return {
      success: true,
      message: 'KYC application submitted successfully',
      estimatedProcessingTime: processingTime
    };
  }

  async checkKYCStatus(userId: string): Promise<KYCProfile | null> {
    // Mock implementation - in production, fetch from database
    return null;
  }

  async updateKYCProfile(userId: string, updates: Partial<KYCProfile>): Promise<boolean> {
    // Mock implementation - in production, update database
    return true;
  }

  getKYCLimits(regionCode: string, level: 1 | 2 | 3): { daily: number; monthly: number; annual: number; currency: string } | null {
    const config = this.getRegionConfig(regionCode);
    const kycLevel = config?.levels.find(l => l.level === level);
    return kycLevel?.limits || null;
  }

  isKYCRequired(regionCode: string, amount: number, currency: string): { required: boolean; suggestedLevel?: number } {
    const config = this.getRegionConfig(regionCode);
    if (!config) return { required: false };

    // Check against each level's limits
    for (const level of config.levels) {
      if (level.limits.currency === currency && amount <= level.limits.daily) {
        return { required: true, suggestedLevel: level.level };
      }
    }

    // If amount exceeds all limits, require highest level
    return { required: true, suggestedLevel: 3 };
  }

  getComplianceInfo(regionCode: string): { framework: string; authority: string; retention: number } | null {
    const config = this.getRegionConfig(regionCode);
    if (!config) return null;

    return {
      framework: config.complianceFramework,
      authority: config.regulatoryAuthority,
      retention: config.dataRetentionPeriod
    };
  }

  async generateKYCReport(userId: string): Promise<{
    profile: KYCProfile;
    complianceStatus: string;
    recommendations: string[];
  } | null> {
    // Mock implementation - in production, generate comprehensive report
    return null;
  }

  async scheduleKYCRenewal(userId: string, renewalDate: Date): Promise<boolean> {
    // Mock implementation - in production, schedule renewal notifications
    return true;
  }

  getDocumentRequirements(regionCode: string, documentType: string): {
    format: string[];
    maxSize: number;
    requirements: string[];
    examples: string[];
  } | null {
    const requirements: { [key: string]: any } = {
      'passport': {
        format: ['image/jpeg', 'image/png', 'application/pdf'],
        maxSize: 10 * 1024 * 1024, // 10MB
        requirements: [
          'Clear, high-resolution image',
          'All corners visible',
          'No glare or shadows',
          'Valid and unexpired'
        ],
        examples: [
          'Photo page of passport',
          'Scan of passport photo page'
        ]
      },
      'aadhaar': {
        format: ['image/jpeg', 'image/png', 'application/pdf'],
        maxSize: 5 * 1024 * 1024, // 5MB
        requirements: [
          'Clear image of front side',
          'All text clearly readable',
          'No masking of Aadhaar number',
          'Valid Aadhaar card'
        ],
        examples: [
          'Front side of Aadhaar card',
          'Downloaded e-Aadhaar PDF'
        ]
      },
      'utility_bill': {
        format: ['image/jpeg', 'image/png', 'application/pdf'],
        maxSize: 15 * 1024 * 1024, // 15MB
        requirements: [
          'Issued within last 3 months',
          'Shows full name and address',
          'From recognized utility provider',
          'Clear and readable'
        ],
        examples: [
          'Electricity bill',
          'Water bill',
          'Gas bill',
          'Internet/cable bill'
        ]
      }
    };

    return requirements[documentType] || null;
  }
}

export const kycService = new KYCService();
