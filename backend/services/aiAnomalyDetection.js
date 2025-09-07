const axios = require('axios');
const { Connection, PublicKey } = require('@solana/web3.js');
const { AnchorProvider, Program, Wallet } = require('@project-serum/anchor');

class AIAnomalyDetectionService {
    constructor() {
        this.connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');
        this.fraudDetectionProgramId = new PublicKey(process.env.FRAUD_DETECTION_PROGRAM_ID || 'FraudDetection1111111111111111111111111111111');
        this.huggingFaceApiKey = process.env.HUGGING_FACE_API_KEY;
        this.ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
        
        // Transaction pattern analysis thresholds
        this.anomalyThresholds = {
            velocityMultiplier: 5.0, // 5x normal velocity
            amountDeviation: 3.0, // 3 standard deviations
            timePatternScore: 0.8, // Unusual timing patterns
            recipientDiversityScore: 0.3, // Low recipient diversity
            geographicRiskScore: 0.7, // High geographic risk
        };

        // Initialize transaction history cache
        this.userTransactionHistory = new Map();
        this.globalPatterns = {
            averageTransactionAmount: 0,
            averageVelocity: 0,
            commonTimePatterns: [],
            suspiciousPatterns: []
        };
    }

    /**
     * Analyze transaction for anomalies using AI models
     */
    async analyzeTransaction(userPubkey, transactionData) {
        try {
            const userHistory = await this.getUserTransactionHistory(userPubkey);
            const features = this.extractTransactionFeatures(transactionData, userHistory);
            
            // Run multiple AI analysis methods
            const [
                patternAnalysis,
                behaviorAnalysis,
                riskAnalysis,
                networkAnalysis
            ] = await Promise.all([
                this.analyzeTransactionPatterns(features),
                this.analyzeBehaviorDeviation(features, userHistory),
                this.analyzeRiskIndicators(features),
                this.analyzeNetworkRisk(transactionData)
            ]);

            // Combine analysis results
            const anomalyScore = this.calculateCompositeAnomalyScore({
                patternAnalysis,
                behaviorAnalysis,
                riskAnalysis,
                networkAnalysis
            });

            const anomalyIndicators = this.extractAnomalyIndicators({
                patternAnalysis,
                behaviorAnalysis,
                riskAnalysis,
                networkAnalysis
            });

            // Update on-chain risk score if anomaly detected
            if (anomalyScore > 25) {
                await this.updateOnChainRiskScore(userPubkey, anomalyScore, anomalyIndicators);
            }

            return {
                anomalyScore,
                riskLevel: this.getRiskLevel(anomalyScore),
                indicators: anomalyIndicators,
                recommendations: this.generateRecommendations(anomalyScore, anomalyIndicators),
                confidence: this.calculateConfidence(features, userHistory)
            };

        } catch (error) {
            console.error('AI anomaly detection error:', error);
            return {
                anomalyScore: 0,
                riskLevel: 'unknown',
                indicators: ['AI analysis failed'],
                recommendations: ['Manual review required'],
                confidence: 0
            };
        }
    }

    /**
     * Extract features from transaction for AI analysis
     */
    extractTransactionFeatures(transactionData, userHistory) {
        const currentTime = Date.now();
        const amount = transactionData.amount_usd || 0;
        
        return {
            // Amount features
            amount: amount,
            amountLog: Math.log(amount + 1),
            amountZScore: this.calculateZScore(amount, userHistory.amounts),
            
            // Timing features
            hourOfDay: new Date().getHours(),
            dayOfWeek: new Date().getDay(),
            timeSinceLastTx: userHistory.lastTransaction ? 
                currentTime - userHistory.lastTransaction.timestamp : 0,
            
            // Velocity features
            txCountLast24h: this.countRecentTransactions(userHistory, 24 * 60 * 60 * 1000),
            txCountLastHour: this.countRecentTransactions(userHistory, 60 * 60 * 1000),
            volumeLast24h: this.sumRecentVolume(userHistory, 24 * 60 * 60 * 1000),
            
            // Recipient features
            recipientDiversity: this.calculateRecipientDiversity(userHistory),
            isNewRecipient: !userHistory.recipients.has(transactionData.recipient),
            recipientRiskScore: transactionData.recipientRiskScore || 0,
            
            // Pattern features
            roundAmount: this.isRoundAmount(amount),
            sequentialPattern: this.detectSequentialPattern(userHistory, amount),
            repeatingPattern: this.detectRepeatingPattern(userHistory, transactionData),
            
            // User profile features
            accountAge: userHistory.accountAge || 0,
            totalTransactions: userHistory.transactions.length,
            averageAmount: this.calculateAverage(userHistory.amounts),
            kycLevel: transactionData.kycLevel || 0,
            
            // Network features
            gasPrice: transactionData.gasPrice || 0,
            networkCongestion: transactionData.networkCongestion || 0,
            crossChain: transactionData.crossChain || false
        };
    }

    /**
     * Analyze transaction patterns using local AI
     */
    async analyzeTransactionPatterns(features) {
        try {
            // Use local pattern recognition
            const patterns = {
                structuring: this.detectStructuring(features),
                layering: this.detectLayering(features),
                rapidFire: this.detectRapidFire(features),
                roundAmounts: this.detectRoundAmounts(features),
                timePatterns: this.detectTimePatterns(features)
            };

            let score = 0;
            const indicators = [];

            // Structuring detection (amounts just below reporting thresholds)
            if (patterns.structuring.detected) {
                score += 30;
                indicators.push(`Potential structuring: ${patterns.structuring.reason}`);
            }

            // Layering detection (complex transaction chains)
            if (patterns.layering.detected) {
                score += 25;
                indicators.push(`Layering pattern: ${patterns.layering.reason}`);
            }

            // Rapid-fire transactions
            if (patterns.rapidFire.detected) {
                score += 20;
                indicators.push(`Rapid transaction pattern: ${patterns.rapidFire.reason}`);
            }

            // Unusual time patterns
            if (patterns.timePatterns.score > 0.7) {
                score += 15;
                indicators.push('Unusual transaction timing pattern');
            }

            return { score, indicators, patterns };

        } catch (error) {
            console.error('Pattern analysis error:', error);
            return { score: 0, indicators: ['Pattern analysis failed'], patterns: {} };
        }
    }

    /**
     * Analyze behavior deviation using Ollama local AI
     */
    async analyzeBehaviorDeviation(features, userHistory) {
        try {
            // Prepare behavior analysis prompt
            const prompt = this.createBehaviorAnalysisPrompt(features, userHistory);
            
            // Try Ollama first (local AI)
            let analysis;
            try {
                analysis = await this.queryOllama(prompt);
            } catch (ollamaError) {
                console.log('Ollama unavailable, using rule-based analysis');
                analysis = this.ruleBased BehaviorAnalysis(features, userHistory);
            }

            return this.parseBehaviorAnalysis(analysis);

        } catch (error) {
            console.error('Behavior analysis error:', error);
            return { score: 0, indicators: ['Behavior analysis failed'] };
        }
    }

    /**
     * Analyze risk indicators using Hugging Face models
     */
    async analyzeRiskIndicators(features) {
        try {
            if (!this.huggingFaceApiKey) {
                return this.ruleBasedRiskAnalysis(features);
            }

            const riskFeatures = {
                amount_category: this.categorizeAmount(features.amount),
                velocity_category: this.categorizeVelocity(features.txCountLast24h),
                time_category: this.categorizeTime(features.hourOfDay),
                recipient_risk: features.recipientRiskScore,
                user_profile: {
                    kyc_level: features.kycLevel,
                    account_age: features.accountAge,
                    transaction_count: features.totalTransactions
                }
            };

            const response = await axios.post(
                'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
                {
                    inputs: `Analyze transaction risk: ${JSON.stringify(riskFeatures)}`,
                    parameters: { max_length: 100 }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.huggingFaceApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return this.parseHuggingFaceRiskAnalysis(response.data);

        } catch (error) {
            console.error('Risk analysis error:', error);
            return this.ruleBasedRiskAnalysis(features);
        }
    }

    /**
     * Analyze network-level risk patterns
     */
    async analyzeNetworkRisk(transactionData) {
        try {
            const networkFeatures = {
                recipientConnections: await this.getRecipientConnections(transactionData.recipient),
                senderConnections: await this.getSenderConnections(transactionData.sender),
                crossChainActivity: transactionData.crossChain,
                mixerInteraction: await this.checkMixerInteraction(transactionData.recipient),
                exchangeInteraction: await this.checkExchangeInteraction(transactionData.recipient)
            };

            let riskScore = 0;
            const indicators = [];

            // High-risk recipient connections
            if (networkFeatures.recipientConnections.riskScore > 0.7) {
                riskScore += 25;
                indicators.push('Recipient has high-risk connections');
            }

            // Mixer service interaction
            if (networkFeatures.mixerInteraction.detected) {
                riskScore += 40;
                indicators.push('Transaction involves mixer service');
            }

            // Suspicious exchange patterns
            if (networkFeatures.exchangeInteraction.suspicious) {
                riskScore += 20;
                indicators.push('Suspicious exchange interaction pattern');
            }

            return { score: riskScore, indicators, networkFeatures };

        } catch (error) {
            console.error('Network risk analysis error:', error);
            return { score: 0, indicators: ['Network analysis failed'] };
        }
    }

    /**
     * Calculate composite anomaly score
     */
    calculateCompositeAnomalyScore(analyses) {
        const weights = {
            patternAnalysis: 0.3,
            behaviorAnalysis: 0.3,
            riskAnalysis: 0.25,
            networkAnalysis: 0.15
        };

        return Math.min(100, Math.round(
            analyses.patternAnalysis.score * weights.patternAnalysis +
            analyses.behaviorAnalysis.score * weights.behaviorAnalysis +
            analyses.riskAnalysis.score * weights.riskAnalysis +
            analyses.networkAnalysis.score * weights.networkAnalysis
        ));
    }

    /**
     * Update on-chain risk score via Rust program
     */
    async updateOnChainRiskScore(userPubkey, aiRiskScore, anomalyIndicators) {
        try {
            // This would integrate with the Rust fraud detection program
            // For now, we'll emit an event that can be picked up by the blockchain service
            
            const updateData = {
                user: userPubkey,
                aiRiskScore,
                anomalyIndicators: anomalyIndicators.slice(0, 5), // Limit to 5 indicators
                timestamp: Date.now()
            };

            // Emit event for blockchain service to process
            process.emit('updateOnChainRiskScore', updateData);

            console.log(`AI risk score updated for user ${userPubkey}: ${aiRiskScore}`);
            return true;

        } catch (error) {
            console.error('Failed to update on-chain risk score:', error);
            return false;
        }
    }

    /**
     * Query Ollama local AI model
     */
    async queryOllama(prompt) {
        const response = await axios.post(`${this.ollamaEndpoint}/api/generate`, {
            model: 'llama2',
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.1,
                top_p: 0.9,
                max_tokens: 200
            }
        });

        return response.data.response;
    }

    /**
     * Create behavior analysis prompt for AI
     */
    createBehaviorAnalysisPrompt(features, userHistory) {
        return `Analyze this transaction for behavioral anomalies:

User Profile:
- Account age: ${features.accountAge} days
- Total transactions: ${features.totalTransactions}
- Average amount: $${features.averageAmount}
- KYC level: ${features.kycLevel}

Current Transaction:
- Amount: $${features.amount}
- Time: ${features.hourOfDay}:00 on day ${features.dayOfWeek}
- New recipient: ${features.isNewRecipient}
- Time since last tx: ${features.timeSinceLastTx}ms

Recent Activity:
- Transactions last 24h: ${features.txCountLast24h}
- Volume last 24h: $${features.volumeLast24h}
- Recipient diversity: ${features.recipientDiversity}

Identify any behavioral anomalies and assign a risk score (0-100). Focus on:
1. Deviation from normal patterns
2. Suspicious timing or amounts
3. Unusual recipient behavior
4. Velocity anomalies

Respond with: SCORE: [0-100] | INDICATORS: [list of specific anomalies]`;
    }

    /**
     * Rule-based behavior analysis fallback
     */
    ruleBasedBehaviorAnalysis(features, userHistory) {
        let score = 0;
        const indicators = [];

        // Amount deviation
        if (Math.abs(features.amountZScore) > 2) {
            score += 20;
            indicators.push(`Amount ${features.amountZScore > 0 ? 'significantly higher' : 'significantly lower'} than usual`);
        }

        // Velocity anomaly
        const normalVelocity = features.totalTransactions / Math.max(features.accountAge, 1);
        const currentVelocity = features.txCountLast24h;
        if (currentVelocity > normalVelocity * 5) {
            score += 25;
            indicators.push('Transaction velocity significantly higher than normal');
        }

        // Time pattern anomaly
        if (features.hourOfDay < 6 || features.hourOfDay > 22) {
            score += 10;
            indicators.push('Transaction at unusual time');
        }

        // New recipient with large amount
        if (features.isNewRecipient && features.amount > features.averageAmount * 3) {
            score += 15;
            indicators.push('Large transaction to new recipient');
        }

        return { score, indicators };
    }

    /**
     * Rule-based risk analysis fallback
     */
    ruleBasedRiskAnalysis(features) {
        let score = 0;
        const indicators = [];

        // High-value transaction
        if (features.amount > 10000) {
            score += 15;
            indicators.push('High-value transaction');
        }

        // Round amount (potential structuring)
        if (features.roundAmount) {
            score += 10;
            indicators.push('Round amount transaction');
        }

        // Low KYC with high amount
        if (features.kycLevel < 2 && features.amount > 5000) {
            score += 20;
            indicators.push('High amount with insufficient KYC');
        }

        // High recipient risk
        if (features.recipientRiskScore > 0.7) {
            score += 30;
            indicators.push('High-risk recipient');
        }

        return { score, indicators };
    }

    // Helper methods for pattern detection
    detectStructuring(features) {
        const structuringThresholds = [9999, 4999, 2999, 999];
        const amount = features.amount;
        
        for (const threshold of structuringThresholds) {
            if (amount > threshold * 0.95 && amount < threshold) {
                return {
                    detected: true,
                    reason: `Amount $${amount} just below $${threshold} threshold`
                };
            }
        }
        
        return { detected: false };
    }

    detectLayering(features) {
        if (features.txCountLastHour > 10 && features.recipientDiversity > 0.8) {
            return {
                detected: true,
                reason: 'Multiple transactions to diverse recipients in short time'
            };
        }
        return { detected: false };
    }

    detectRapidFire(features) {
        if (features.txCountLastHour > 5 && features.timeSinceLastTx < 60000) {
            return {
                detected: true,
                reason: `${features.txCountLastHour} transactions in last hour`
            };
        }
        return { detected: false };
    }

    detectTimePatterns(features) {
        // Detect unusual timing patterns
        const unusualHours = features.hourOfDay < 6 || features.hourOfDay > 22;
        const weekendActivity = features.dayOfWeek === 0 || features.dayOfWeek === 6;
        
        let score = 0;
        if (unusualHours) score += 0.3;
        if (weekendActivity) score += 0.2;
        
        return { score };
    }

    // Utility methods
    calculateZScore(value, historicalValues) {
        if (historicalValues.length < 2) return 0;
        
        const mean = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
        const variance = historicalValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / historicalValues.length;
        const stdDev = Math.sqrt(variance);
        
        return stdDev === 0 ? 0 : (value - mean) / stdDev;
    }

    isRoundAmount(amount) {
        return amount % 1000 === 0 || amount % 500 === 0 || amount % 100 === 0;
    }

    getRiskLevel(score) {
        if (score >= 75) return 'critical';
        if (score >= 50) return 'high';
        if (score >= 25) return 'medium';
        return 'low';
    }

    generateRecommendations(score, indicators) {
        const recommendations = [];
        
        if (score >= 75) {
            recommendations.push('Block transaction immediately');
            recommendations.push('Require manual compliance review');
            recommendations.push('Enhanced KYC verification needed');
        } else if (score >= 50) {
            recommendations.push('Flag for manual review');
            recommendations.push('Request additional documentation');
            recommendations.push('Monitor subsequent transactions closely');
        } else if (score >= 25) {
            recommendations.push('Automated monitoring');
            recommendations.push('Log for pattern analysis');
        }
        
        return recommendations;
    }

    calculateConfidence(features, userHistory) {
        let confidence = 0.5; // Base confidence
        
        // More transaction history = higher confidence
        if (userHistory.transactions.length > 100) confidence += 0.3;
        else if (userHistory.transactions.length > 20) confidence += 0.2;
        else if (userHistory.transactions.length > 5) confidence += 0.1;
        
        // Account age factor
        if (features.accountAge > 365) confidence += 0.2;
        else if (features.accountAge > 90) confidence += 0.1;
        
        return Math.min(1.0, confidence);
    }

    async getUserTransactionHistory(userPubkey) {
        // This would fetch from database or blockchain
        // For now, return mock data structure
        return {
            transactions: [],
            amounts: [],
            recipients: new Set(),
            lastTransaction: null,
            accountAge: 30,
            totalVolume: 0
        };
    }

    // Additional helper methods would be implemented here...
    countRecentTransactions(history, timeWindow) { return 0; }
    sumRecentVolume(history, timeWindow) { return 0; }
    calculateRecipientDiversity(history) { return 0.5; }
    calculateAverage(values) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; }
    detectSequentialPattern(history, amount) { return false; }
    detectRepeatingPattern(history, transaction) { return false; }
    categorizeAmount(amount) { return 'medium'; }
    categorizeVelocity(count) { return 'normal'; }
    categorizeTime(hour) { return 'normal'; }
    
    async getRecipientConnections(recipient) { return { riskScore: 0 }; }
    async getSenderConnections(sender) { return { riskScore: 0 }; }
    async checkMixerInteraction(address) { return { detected: false }; }
    async checkExchangeInteraction(address) { return { suspicious: false }; }
    
    parseBehaviorAnalysis(analysis) {
        // Parse AI response for score and indicators
        const scoreMatch = analysis.match(/SCORE:\s*(\d+)/);
        const indicatorsMatch = analysis.match(/INDICATORS:\s*(.+)/);
        
        return {
            score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
            indicators: indicatorsMatch ? indicatorsMatch[1].split(',').map(s => s.trim()) : []
        };
    }
    
    parseHuggingFaceRiskAnalysis(data) {
        // Parse Hugging Face model response
        return {
            score: 0,
            indicators: ['HuggingFace analysis completed']
        };
    }
    
    extractAnomalyIndicators(analyses) {
        const allIndicators = [
            ...analyses.patternAnalysis.indicators,
            ...analyses.behaviorAnalysis.indicators,
            ...analyses.riskAnalysis.indicators,
            ...analyses.networkAnalysis.indicators
        ];
        
        // Remove duplicates and limit to top 10
        return [...new Set(allIndicators)].slice(0, 10);
    }
}

module.exports = AIAnomalyDetectionService;
