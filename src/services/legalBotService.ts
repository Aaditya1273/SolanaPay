import { v4 as uuidv4 } from 'uuid';

// Types and Interfaces
export interface LegalQuery {
  id: string;
  question: string;
  category: LegalCategory;
  region: string;
  timestamp: Date;
  userId?: string;
}

export interface LegalResponse {
  id: string;
  queryId: string;
  answer: string;
  sources: LegalSource[];
  confidence: number;
  disclaimer: string;
  followUpQuestions: string[];
  relatedTopics: string[];
  timestamp: Date;
}

export interface LegalSource {
  id: string;
  title: string;
  type: 'regulation' | 'statute' | 'case_law' | 'guidance' | 'best_practice';
  jurisdiction: string;
  url?: string;
  excerpt: string;
  relevanceScore: number;
}

export interface ComplianceRule {
  id: string;
  title: string;
  description: string;
  jurisdiction: string;
  assetTypes: AssetType[];
  requirements: string[];
  penalties: string[];
  lastUpdated: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RiskAssessment {
  id: string;
  assetId: string;
  jurisdiction: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  complianceGaps: ComplianceGap[];
  recommendations: string[];
  lastAssessed: Date;
}

export interface RiskFactor {
  category: string;
  description: string;
  impact: number; // 1-10 scale
  likelihood: number; // 1-10 scale
  mitigation: string;
}

export interface ComplianceGap {
  requirement: string;
  currentStatus: string;
  requiredAction: string;
  deadline?: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export type LegalCategory = 
  | 'securities_law'
  | 'tax_compliance'
  | 'kyc_aml'
  | 'data_protection'
  | 'cross_border'
  | 'tokenization'
  | 'custody'
  | 'licensing'
  | 'investor_protection'
  | 'general';

export type AssetType = 
  | 'real_estate'
  | 'securities'
  | 'commodities'
  | 'carbon_credits'
  | 'precious_metals'
  | 'intellectual_property'
  | 'renewable_energy'
  | 'bonds'
  | 'equity';

export type Region = 
  | 'US'
  | 'EU'
  | 'UK'
  | 'APAC'
  | 'MENA'
  | 'LATAM'
  | 'GLOBAL';

// Legal Knowledge Base
class LegalKnowledgeBase {
  private regulations: Map<string, ComplianceRule[]> = new Map();
  private caseLaw: Map<string, LegalSource[]> = new Map();
  private guidance: Map<string, LegalSource[]> = new Map();

  constructor() {
    this.initializeKnowledgeBase();
  }

  private initializeKnowledgeBase() {
    // US Regulations
    this.regulations.set('US', [
      {
        id: 'sec-rule-506',
        title: 'SEC Rule 506 - Private Placement Exemption',
        description: 'Exemption from registration for private offerings under Regulation D',
        jurisdiction: 'US',
        assetTypes: ['securities', 'real_estate'],
        requirements: [
          'Accredited investor verification',
          'Form D filing within 15 days',
          'No general solicitation (506(b)) or general solicitation allowed with verification (506(c))',
          'Bad actor disqualification checks'
        ],
        penalties: ['SEC enforcement action', 'Rescission rights for investors', 'Civil penalties up to $100,000'],
        lastUpdated: new Date('2023-01-15'),
        severity: 'high'
      },
      {
        id: 'cftc-commodity-pool',
        title: 'CFTC Commodity Pool Regulations',
        description: 'Regulations for commodity pool operators and commodity trading advisors',
        jurisdiction: 'US',
        assetTypes: ['commodities', 'precious_metals'],
        requirements: [
          'CPO registration if managing commodity interests',
          'Disclosure document delivery',
          'Recordkeeping requirements',
          'Periodic reporting to participants'
        ],
        penalties: ['Registration revocation', 'Civil monetary penalties', 'Cease and desist orders'],
        lastUpdated: new Date('2023-03-20'),
        severity: 'medium'
      }
    ]);

    // EU Regulations
    this.regulations.set('EU', [
      {
        id: 'mifid-ii',
        title: 'MiFID II - Markets in Financial Instruments Directive',
        description: 'EU regulation for investment services and financial markets',
        jurisdiction: 'EU',
        assetTypes: ['securities', 'bonds'],
        requirements: [
          'Authorization as investment firm',
          'Client categorization (retail, professional, eligible counterparty)',
          'Best execution obligations',
          'Transaction reporting to regulators'
        ],
        penalties: ['Authorization withdrawal', 'Administrative fines up to €5M or 10% of turnover', 'Public warnings'],
        lastUpdated: new Date('2023-02-10'),
        severity: 'critical'
      },
      {
        id: 'gdpr',
        title: 'General Data Protection Regulation (GDPR)',
        description: 'EU regulation on data protection and privacy',
        jurisdiction: 'EU',
        assetTypes: ['real_estate', 'securities', 'commodities'],
        requirements: [
          'Lawful basis for processing personal data',
          'Data subject consent mechanisms',
          'Data protection impact assessments',
          'Appointment of Data Protection Officer if required'
        ],
        penalties: ['Fines up to €20M or 4% of annual turnover', 'Data processing bans', 'Compensation claims'],
        lastUpdated: new Date('2023-01-01'),
        severity: 'critical'
      }
    ]);

    // Initialize case law and guidance
    this.initializeCaseLaw();
    this.initializeGuidance();
  }

  private initializeCaseLaw() {
    this.caseLaw.set('US', [
      {
        id: 'howey-test',
        title: 'SEC v. W.J. Howey Co. (1946)',
        type: 'case_law',
        jurisdiction: 'US',
        excerpt: 'Established the four-prong test for determining whether an arrangement constitutes an investment contract: (1) investment of money, (2) common enterprise, (3) expectation of profits, (4) derived from efforts of others.',
        relevanceScore: 0.95
      },
      {
        id: 'reves-test',
        title: 'Reves v. Ernst & Young (1990)',
        type: 'case_law',
        jurisdiction: 'US',
        excerpt: 'Supreme Court established the "family resemblance" test for determining when a note is a security, focusing on motivations of buyer and seller, plan of distribution, reasonable expectations of investing public, and risk-reducing factors.',
        relevanceScore: 0.85
      }
    ]);
  }

  private initializeGuidance() {
    this.guidance.set('US', [
      {
        id: 'sec-digital-assets-guidance',
        title: 'SEC Staff Statement on Digital Assets',
        type: 'guidance',
        jurisdiction: 'US',
        excerpt: 'Provides guidance on applying federal securities laws to digital assets, including factors for determining whether a digital asset is a security.',
        relevanceScore: 0.90
      }
    ]);
  }

  getRegulations(jurisdiction: string): ComplianceRule[] {
    return this.regulations.get(jurisdiction) || [];
  }

  getCaseLaw(jurisdiction: string): LegalSource[] {
    return this.caseLaw.get(jurisdiction) || [];
  }

  getGuidance(jurisdiction: string): LegalSource[] {
    return this.guidance.get(jurisdiction) || [];
  }

  searchRelevantSources(query: string, jurisdiction: string): LegalSource[] {
    const allSources = [
      ...this.getCaseLaw(jurisdiction),
      ...this.getGuidance(jurisdiction)
    ];

    // Simple keyword matching - in production, this would use more sophisticated NLP
    const keywords = query.toLowerCase().split(' ');
    return allSources.filter(source => {
      const sourceText = (source.title + ' ' + source.excerpt).toLowerCase();
      return keywords.some(keyword => sourceText.includes(keyword));
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}

// AI Legal Bot Service
class LegalBotService {
  private knowledgeBase: LegalKnowledgeBase;
  private conversationHistory: Map<string, LegalQuery[]> = new Map();

  constructor() {
    this.knowledgeBase = new LegalKnowledgeBase();
  }

  async processQuery(query: LegalQuery): Promise<LegalResponse> {
    // Store query in conversation history
    const userHistory = this.conversationHistory.get(query.userId || 'anonymous') || [];
    userHistory.push(query);
    this.conversationHistory.set(query.userId || 'anonymous', userHistory);

    // Analyze query and generate response
    const response = await this.generateResponse(query);
    return response;
  }

  private async generateResponse(query: LegalQuery): Promise<LegalResponse> {
    // Categorize the query
    const category = this.categorizeQuery(query.question);
    
    // Find relevant sources
    const sources = this.knowledgeBase.searchRelevantSources(query.question, query.region);
    
    // Generate answer based on query type and sources
    const answer = this.generateAnswer(query, category, sources);
    
    // Calculate confidence score
    const confidence = this.calculateConfidence(query, sources);
    
    // Generate follow-up questions
    const followUpQuestions = this.generateFollowUpQuestions(category);
    
    // Generate related topics
    const relatedTopics = this.generateRelatedTopics(category);

    return {
      id: uuidv4(),
      queryId: query.id,
      answer,
      sources: sources.slice(0, 3), // Top 3 most relevant sources
      confidence,
      disclaimer: this.getDisclaimer(),
      followUpQuestions,
      relatedTopics,
      timestamp: new Date()
    };
  }

  private categorizeQuery(question: string): LegalCategory {
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('securities') || questionLower.includes('investment contract')) {
      return 'securities_law';
    }
    if (questionLower.includes('tax') || questionLower.includes('taxation')) {
      return 'tax_compliance';
    }
    if (questionLower.includes('kyc') || questionLower.includes('aml') || questionLower.includes('know your customer')) {
      return 'kyc_aml';
    }
    if (questionLower.includes('data') || questionLower.includes('privacy') || questionLower.includes('gdpr')) {
      return 'data_protection';
    }
    if (questionLower.includes('cross-border') || questionLower.includes('international')) {
      return 'cross_border';
    }
    if (questionLower.includes('token') || questionLower.includes('blockchain')) {
      return 'tokenization';
    }
    if (questionLower.includes('custody') || questionLower.includes('custodian')) {
      return 'custody';
    }
    if (questionLower.includes('license') || questionLower.includes('registration')) {
      return 'licensing';
    }
    if (questionLower.includes('investor protection') || questionLower.includes('accredited')) {
      return 'investor_protection';
    }
    
    return 'general';
  }

  private generateAnswer(query: LegalQuery, category: LegalCategory, sources: LegalSource[]): string {
    // This is a simplified answer generation - in production, this would use advanced NLP/LLM
    const templates = {
      securities_law: `Based on securities law principles, particularly the Howey test established in SEC v. W.J. Howey Co., your question relates to whether an investment arrangement constitutes a security. The key factors to consider are: (1) investment of money, (2) common enterprise, (3) expectation of profits, and (4) profits derived from efforts of others.`,
      
      tax_compliance: `Tax compliance for RWA investments involves several considerations depending on your jurisdiction. Generally, you'll need to consider: (1) classification of the asset for tax purposes, (2) timing of income recognition, (3) applicable tax rates, and (4) reporting requirements.`,
      
      kyc_aml: `Know Your Customer (KYC) and Anti-Money Laundering (AML) requirements are critical for RWA platforms. Key requirements typically include: (1) customer identification and verification, (2) ongoing monitoring, (3) suspicious activity reporting, and (4) recordkeeping obligations.`,
      
      data_protection: `Data protection compliance, especially under GDPR in the EU, requires careful handling of personal data. Key principles include: (1) lawful basis for processing, (2) data minimization, (3) purpose limitation, and (4) individual rights protection.`,
      
      general: `For general RWA investment compliance, consider these key areas: (1) securities law compliance, (2) licensing requirements, (3) investor protection rules, and (4) cross-border regulations if applicable.`
    };

    let baseAnswer = templates[category] || templates.general;

    // Add source-specific information if available
    if (sources.length > 0) {
      baseAnswer += `\n\nRelevant authorities include: ${sources.map(s => s.title).join(', ')}.`;
    }

    return baseAnswer;
  }

  private calculateConfidence(query: LegalQuery, sources: LegalSource[]): number {
    // Simple confidence calculation based on source availability and relevance
    if (sources.length === 0) return 0.3;
    
    const avgRelevance = sources.reduce((sum, source) => sum + source.relevanceScore, 0) / sources.length;
    const sourceBonus = Math.min(sources.length * 0.1, 0.3);
    
    return Math.min(avgRelevance + sourceBonus, 0.95);
  }

  private generateFollowUpQuestions(category: LegalCategory): string[] {
    const questions = {
      securities_law: [
        "What are the requirements for accredited investor verification?",
        "How do I determine if my token offering is a security?",
        "What are the penalties for unregistered securities offerings?"
      ],
      tax_compliance: [
        "How are RWA investments taxed in my jurisdiction?",
        "What records do I need to keep for tax purposes?",
        "Are there any tax advantages for certain types of RWA investments?"
      ],
      kyc_aml: [
        "What information do I need to collect from investors?",
        "How often should I update customer information?",
        "What constitutes suspicious activity in RWA investing?"
      ],
      general: [
        "What licenses might I need to operate an RWA platform?",
        "How do cross-border regulations affect my business?",
        "What are the key compliance risks I should be aware of?"
      ]
    };

    return questions[category] || questions.general;
  }

  private generateRelatedTopics(category: LegalCategory): string[] {
    const topics = {
      securities_law: ["Regulation D", "Accredited Investors", "Investment Contracts", "Private Placements"],
      tax_compliance: ["Capital Gains", "Income Tax", "Withholding Tax", "Tax Treaties"],
      kyc_aml: ["Customer Due Diligence", "Beneficial Ownership", "PEP Screening", "Transaction Monitoring"],
      general: ["Licensing", "Cross-border Compliance", "Investor Protection", "Market Regulation"]
    };

    return topics[category] || topics.general;
  }

  private getDisclaimer(): string {
    return "This information is for educational purposes only and does not constitute legal advice. Always consult with qualified legal counsel for specific legal matters. Laws and regulations vary by jurisdiction and change frequently.";
  }

  // Compliance checking methods
  async assessCompliance(assetType: AssetType, jurisdiction: string): Promise<RiskAssessment> {
    const regulations = this.knowledgeBase.getRegulations(jurisdiction);
    const applicableRules = regulations.filter(rule => rule.assetTypes.includes(assetType));
    
    const riskFactors: RiskFactor[] = applicableRules.map(rule => ({
      category: rule.title,
      description: rule.description,
      impact: this.calculateImpact(rule.severity),
      likelihood: 0.7, // Default likelihood
      mitigation: `Ensure compliance with: ${rule.requirements.join(', ')}`
    }));

    const complianceGaps: ComplianceGap[] = applicableRules.flatMap(rule => 
      rule.requirements.map(req => ({
        requirement: req,
        currentStatus: 'Not Assessed',
        requiredAction: 'Review and implement compliance measures',
        priority: rule.severity as 'low' | 'medium' | 'high' | 'critical'
      }))
    );

    const riskLevel = this.calculateOverallRisk(riskFactors);

    return {
      id: uuidv4(),
      assetId: 'assessment-' + Date.now(),
      jurisdiction,
      riskLevel,
      riskFactors,
      complianceGaps,
      recommendations: this.generateRecommendations(riskLevel, applicableRules),
      lastAssessed: new Date()
    };
  }

  private calculateImpact(severity: string): number {
    const severityMap = { low: 3, medium: 5, high: 7, critical: 9 };
    return severityMap[severity as keyof typeof severityMap] || 5;
  }

  private calculateOverallRisk(riskFactors: RiskFactor[]): 'low' | 'medium' | 'high' | 'critical' {
    if (riskFactors.length === 0) return 'low';
    
    const avgRisk = riskFactors.reduce((sum, factor) => sum + (factor.impact * factor.likelihood), 0) / riskFactors.length;
    
    if (avgRisk < 15) return 'low';
    if (avgRisk < 35) return 'medium';
    if (avgRisk < 55) return 'high';
    return 'critical';
  }

  private generateRecommendations(riskLevel: string, rules: ComplianceRule[]): string[] {
    const baseRecommendations = [
      "Conduct regular compliance reviews",
      "Maintain detailed documentation",
      "Engage qualified legal counsel",
      "Implement robust internal controls"
    ];

    if (riskLevel === 'high' || riskLevel === 'critical') {
      baseRecommendations.push(
        "Consider obtaining regulatory guidance",
        "Implement enhanced due diligence procedures",
        "Establish compliance monitoring systems"
      );
    }

    return baseRecommendations;
  }

  // Mock data generation for demonstration
  generateMockQueries(): LegalQuery[] {
    return [
      {
        id: uuidv4(),
        question: "Is my real estate tokenization project considered a security under US law?",
        category: 'securities_law',
        region: 'US',
        timestamp: new Date(),
        userId: 'user1'
      },
      {
        id: uuidv4(),
        question: "What KYC requirements apply to international investors in my RWA platform?",
        category: 'kyc_aml',
        region: 'EU',
        timestamp: new Date(),
        userId: 'user2'
      },
      {
        id: uuidv4(),
        question: "How are carbon credit investments taxed in the European Union?",
        category: 'tax_compliance',
        region: 'EU',
        timestamp: new Date(),
        userId: 'user3'
      }
    ];
  }
}

// Export singleton instance
export const legalBotService = new LegalBotService();

// Export types and classes
export { LegalBotService, LegalKnowledgeBase };
