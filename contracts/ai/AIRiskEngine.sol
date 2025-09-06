// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title AIRiskEngine
 * @dev AI-powered risk assessment engine for RWA assets and wallet addresses
 * Analyzes on-chain data, transaction patterns, and behavioral metrics
 */
contract AIRiskEngine is 
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    // Risk levels
    enum RiskLevel { VERY_LOW, LOW, MEDIUM, HIGH, VERY_HIGH, BLACKLISTED }
    
    // Asset risk factors
    struct AssetRiskProfile {
        uint256 tokenId;
        address tokenContract;
        RiskLevel riskLevel;
        uint256 riskScore; // 0-1000 (0 = safest, 1000 = highest risk)
        uint256 lastUpdated;
        bool isVerified;
        string[] riskFactors;
        uint256 transactionCount;
        uint256 volumeScore;
        uint256 liquidityScore;
        uint256 ownershipScore;
        uint256 complianceScore;
    }
    
    // Wallet risk factors
    struct WalletRiskProfile {
        address wallet;
        RiskLevel riskLevel;
        uint256 riskScore; // 0-1000
        uint256 lastUpdated;
        bool isKYCVerified;
        bool isBlacklisted;
        uint256 transactionVolume;
        uint256 transactionCount;
        uint256 accountAge;
        uint256 diversificationScore;
        uint256 behaviorScore;
        string[] flaggedActivities;
    }
    
    // Risk scoring weights (in basis points)
    struct RiskWeights {
        uint256 transactionHistory; // 2500 = 25%
        uint256 volumeAnalysis;     // 2000 = 20%
        uint256 liquidityMetrics;   // 1500 = 15%
        uint256 ownershipPattern;   // 1500 = 15%
        uint256 complianceCheck;    // 2500 = 25%
    }
    
    // Fraud detection patterns
    struct FraudPattern {
        string patternName;
        uint256 riskWeight;
        bool isActive;
        uint256 detectionCount;
    }
    
    // State variables
    mapping(bytes32 => AssetRiskProfile) public assetRiskProfiles; // keccak256(tokenContract, tokenId)
    mapping(address => WalletRiskProfile) public walletRiskProfiles;
    mapping(address => bool) public authorizedAnalyzers;
    mapping(string => FraudPattern) public fraudPatterns;
    
    RiskWeights public riskWeights;
    
    // Risk thresholds
    uint256 public constant VERY_LOW_THRESHOLD = 100;
    uint256 public constant LOW_THRESHOLD = 250;
    uint256 public constant MEDIUM_THRESHOLD = 500;
    uint256 public constant HIGH_THRESHOLD = 750;
    uint256 public constant VERY_HIGH_THRESHOLD = 900;
    
    // Analysis parameters
    uint256 public minTransactionsForAnalysis;
    uint256 public analysisTimeWindow; // in seconds
    uint256 public riskUpdateInterval; // in seconds
    
    // Events
    event AssetRiskUpdated(
        address indexed tokenContract,
        uint256 indexed tokenId,
        RiskLevel riskLevel,
        uint256 riskScore,
        string[] riskFactors
    );
    
    event WalletRiskUpdated(
        address indexed wallet,
        RiskLevel riskLevel,
        uint256 riskScore,
        string[] flaggedActivities
    );
    
    event FraudDetected(
        address indexed subject,
        string patternName,
        uint256 riskIncrease,
        uint256 timestamp
    );
    
    event RiskAnalysisRequested(
        address indexed requester,
        address indexed subject,
        string analysisType
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __Pausable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        // Initialize risk weights
        riskWeights = RiskWeights({
            transactionHistory: 2500,
            volumeAnalysis: 2000,
            liquidityMetrics: 1500,
            ownershipPattern: 1500,
            complianceCheck: 2500
        });
        
        minTransactionsForAnalysis = 5;
        analysisTimeWindow = 30 days;
        riskUpdateInterval = 1 hours;
        
        _initializeFraudPatterns();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Analyze asset risk profile
     */
    function analyzeAssetRisk(
        address tokenContract,
        uint256 tokenId,
        bytes calldata onChainData
    ) external whenNotPaused returns (uint256 riskScore) {
        require(authorizedAnalyzers[msg.sender] || msg.sender == owner(), "Unauthorized analyzer");
        
        bytes32 assetKey = keccak256(abi.encodePacked(tokenContract, tokenId));
        AssetRiskProfile storage profile = assetRiskProfiles[assetKey];
        
        // Parse on-chain data and calculate risk factors
        (
            uint256 transactionCount,
            uint256 volumeScore,
            uint256 liquidityScore,
            uint256 ownershipScore,
            uint256 complianceScore,
            string[] memory riskFactors
        ) = _analyzeAssetData(onChainData);
        
        // Calculate weighted risk score
        riskScore = _calculateAssetRiskScore(
            transactionCount,
            volumeScore,
            liquidityScore,
            ownershipScore,
            complianceScore
        );
        
        // Update profile
        profile.tokenId = tokenId;
        profile.tokenContract = tokenContract;
        profile.riskScore = riskScore;
        profile.riskLevel = _getRiskLevel(riskScore);
        profile.lastUpdated = block.timestamp;
        profile.transactionCount = transactionCount;
        profile.volumeScore = volumeScore;
        profile.liquidityScore = liquidityScore;
        profile.ownershipScore = ownershipScore;
        profile.complianceScore = complianceScore;
        profile.riskFactors = riskFactors;
        
        emit AssetRiskUpdated(tokenContract, tokenId, profile.riskLevel, riskScore, riskFactors);
        emit RiskAnalysisRequested(msg.sender, tokenContract, "ASSET_ANALYSIS");
        
        return riskScore;
    }

    /**
     * @dev Analyze wallet risk profile
     */
    function analyzeWalletRisk(
        address wallet,
        bytes calldata transactionHistory
    ) external whenNotPaused returns (uint256 riskScore) {
        require(authorizedAnalyzers[msg.sender] || msg.sender == owner(), "Unauthorized analyzer");
        
        WalletRiskProfile storage profile = walletRiskProfiles[wallet];
        
        // Parse transaction history and calculate metrics
        (
            uint256 transactionVolume,
            uint256 transactionCount,
            uint256 accountAge,
            uint256 diversificationScore,
            uint256 behaviorScore,
            string[] memory flaggedActivities
        ) = _analyzeWalletData(wallet, transactionHistory);
        
        // Calculate risk score
        riskScore = _calculateWalletRiskScore(
            transactionVolume,
            transactionCount,
            accountAge,
            diversificationScore,
            behaviorScore
        );
        
        // Check for fraud patterns
        riskScore = _checkFraudPatterns(wallet, riskScore, flaggedActivities);
        
        // Update profile
        profile.wallet = wallet;
        profile.riskScore = riskScore;
        profile.riskLevel = _getRiskLevel(riskScore);
        profile.lastUpdated = block.timestamp;
        profile.transactionVolume = transactionVolume;
        profile.transactionCount = transactionCount;
        profile.accountAge = accountAge;
        profile.diversificationScore = diversificationScore;
        profile.behaviorScore = behaviorScore;
        profile.flaggedActivities = flaggedActivities;
        
        emit WalletRiskUpdated(wallet, profile.riskLevel, riskScore, flaggedActivities);
        emit RiskAnalysisRequested(msg.sender, wallet, "WALLET_ANALYSIS");
        
        return riskScore;
    }

    /**
     * @dev Calculate asset risk score using weighted factors
     */
    function _calculateAssetRiskScore(
        uint256 transactionCount,
        uint256 volumeScore,
        uint256 liquidityScore,
        uint256 ownershipScore,
        uint256 complianceScore
    ) internal view returns (uint256) {
        uint256 totalScore = 0;
        
        // Transaction history analysis (25%)
        uint256 txScore = transactionCount < minTransactionsForAnalysis ? 800 : 
                         transactionCount > 100 ? 100 : 
                         800 - ((transactionCount - minTransactionsForAnalysis) * 7);
        totalScore += (txScore * riskWeights.transactionHistory) / 10000;
        
        // Volume analysis (20%)
        totalScore += (volumeScore * riskWeights.volumeAnalysis) / 10000;
        
        // Liquidity metrics (15%)
        totalScore += (liquidityScore * riskWeights.liquidityMetrics) / 10000;
        
        // Ownership patterns (15%)
        totalScore += (ownershipScore * riskWeights.ownershipPattern) / 10000;
        
        // Compliance check (25%)
        totalScore += (complianceScore * riskWeights.complianceCheck) / 10000;
        
        return totalScore > 1000 ? 1000 : totalScore;
    }

    /**
     * @dev Calculate wallet risk score
     */
    function _calculateWalletRiskScore(
        uint256 transactionVolume,
        uint256 transactionCount,
        uint256 accountAge,
        uint256 diversificationScore,
        uint256 behaviorScore
    ) internal pure returns (uint256) {
        uint256 riskScore = 0;
        
        // Account age factor (newer accounts = higher risk)
        if (accountAge < 30 days) {
            riskScore += 300;
        } else if (accountAge < 90 days) {
            riskScore += 150;
        } else if (accountAge < 365 days) {
            riskScore += 50;
        }
        
        // Transaction count factor
        if (transactionCount < 10) {
            riskScore += 200;
        } else if (transactionCount > 1000) {
            riskScore -= 50; // Established user
        }
        
        // Volume analysis
        if (transactionVolume > 1000 ether) {
            riskScore += 100; // High volume can indicate wash trading
        }
        
        // Diversification (low diversification = higher risk)
        riskScore += (1000 - diversificationScore) / 4;
        
        // Behavior score
        riskScore += behaviorScore;
        
        return riskScore > 1000 ? 1000 : riskScore;
    }

    /**
     * @dev Check for known fraud patterns
     */
    function _checkFraudPatterns(
        address wallet,
        uint256 baseRiskScore,
        string[] memory flaggedActivities
    ) internal returns (uint256) {
        uint256 additionalRisk = 0;
        
        for (uint256 i = 0; i < flaggedActivities.length; i++) {
            FraudPattern storage pattern = fraudPatterns[flaggedActivities[i]];
            if (pattern.isActive) {
                additionalRisk += pattern.riskWeight;
                pattern.detectionCount++;
                
                emit FraudDetected(wallet, pattern.patternName, pattern.riskWeight, block.timestamp);
            }
        }
        
        uint256 totalRisk = baseRiskScore + additionalRisk;
        return totalRisk > 1000 ? 1000 : totalRisk;
    }

    /**
     * @dev Analyze asset data (mock implementation - would integrate with real AI/ML service)
     */
    function _analyzeAssetData(bytes calldata data) internal pure returns (
        uint256 transactionCount,
        uint256 volumeScore,
        uint256 liquidityScore,
        uint256 ownershipScore,
        uint256 complianceScore,
        string[] memory riskFactors
    ) {
        // Mock analysis - in production, this would call external AI service
        transactionCount = 25;
        volumeScore = 200;
        liquidityScore = 150;
        ownershipScore = 100;
        complianceScore = 50;
        
        riskFactors = new string[](2);
        riskFactors[0] = "Limited transaction history";
        riskFactors[1] = "Moderate liquidity";
        
        return (transactionCount, volumeScore, liquidityScore, ownershipScore, complianceScore, riskFactors);
    }

    /**
     * @dev Analyze wallet data (mock implementation)
     */
    function _analyzeWalletData(
        address wallet,
        bytes calldata data
    ) internal pure returns (
        uint256 transactionVolume,
        uint256 transactionCount,
        uint256 accountAge,
        uint256 diversificationScore,
        uint256 behaviorScore,
        string[] memory flaggedActivities
    ) {
        // Mock analysis
        transactionVolume = 50 ether;
        transactionCount = 150;
        accountAge = 180 days;
        diversificationScore = 700;
        behaviorScore = 100;
        
        flaggedActivities = new string[](1);
        flaggedActivities[0] = "rapid_transactions";
        
        return (transactionVolume, transactionCount, accountAge, diversificationScore, behaviorScore, flaggedActivities);
    }

    /**
     * @dev Get risk level from score
     */
    function _getRiskLevel(uint256 riskScore) internal pure returns (RiskLevel) {
        if (riskScore <= VERY_LOW_THRESHOLD) return RiskLevel.VERY_LOW;
        if (riskScore <= LOW_THRESHOLD) return RiskLevel.LOW;
        if (riskScore <= MEDIUM_THRESHOLD) return RiskLevel.MEDIUM;
        if (riskScore <= HIGH_THRESHOLD) return RiskLevel.HIGH;
        if (riskScore <= VERY_HIGH_THRESHOLD) return RiskLevel.VERY_HIGH;
        return RiskLevel.BLACKLISTED;
    }

    /**
     * @dev Initialize fraud detection patterns
     */
    function _initializeFraudPatterns() internal {
        fraudPatterns["rapid_transactions"] = FraudPattern("Rapid Transactions", 150, true, 0);
        fraudPatterns["wash_trading"] = FraudPattern("Wash Trading", 300, true, 0);
        fraudPatterns["price_manipulation"] = FraudPattern("Price Manipulation", 400, true, 0);
        fraudPatterns["sybil_attack"] = FraudPattern("Sybil Attack", 500, true, 0);
        fraudPatterns["front_running"] = FraudPattern("Front Running", 200, true, 0);
        fraudPatterns["sandwich_attack"] = FraudPattern("Sandwich Attack", 250, true, 0);
        fraudPatterns["rug_pull_indicators"] = FraudPattern("Rug Pull Indicators", 600, true, 0);
    }

    // Admin functions
    function addAuthorizedAnalyzer(address analyzer) external onlyOwner {
        authorizedAnalyzers[analyzer] = true;
    }

    function removeAuthorizedAnalyzer(address analyzer) external onlyOwner {
        authorizedAnalyzers[analyzer] = false;
    }

    function updateRiskWeights(RiskWeights calldata newWeights) external onlyOwner {
        require(
            newWeights.transactionHistory + 
            newWeights.volumeAnalysis + 
            newWeights.liquidityMetrics + 
            newWeights.ownershipPattern + 
            newWeights.complianceCheck == 10000,
            "Weights must sum to 100%"
        );
        riskWeights = newWeights;
    }

    function addFraudPattern(
        string calldata patternName,
        uint256 riskWeight,
        bool isActive
    ) external onlyOwner {
        fraudPatterns[patternName] = FraudPattern(patternName, riskWeight, isActive, 0);
    }

    function blacklistWallet(address wallet) external onlyOwner {
        walletRiskProfiles[wallet].isBlacklisted = true;
        walletRiskProfiles[wallet].riskLevel = RiskLevel.BLACKLISTED;
        walletRiskProfiles[wallet].riskScore = 1000;
    }

    function verifyAsset(address tokenContract, uint256 tokenId) external onlyOwner {
        bytes32 assetKey = keccak256(abi.encodePacked(tokenContract, tokenId));
        assetRiskProfiles[assetKey].isVerified = true;
    }

    // View functions
    function getAssetRiskProfile(address tokenContract, uint256 tokenId) 
        external view returns (AssetRiskProfile memory) {
        bytes32 assetKey = keccak256(abi.encodePacked(tokenContract, tokenId));
        return assetRiskProfiles[assetKey];
    }

    function getWalletRiskProfile(address wallet) 
        external view returns (WalletRiskProfile memory) {
        return walletRiskProfiles[wallet];
    }

    function getRiskLevelColor(RiskLevel level) external pure returns (string memory) {
        if (level == RiskLevel.VERY_LOW) return "green";
        if (level == RiskLevel.LOW) return "blue";
        if (level == RiskLevel.MEDIUM) return "yellow";
        if (level == RiskLevel.HIGH) return "orange";
        if (level == RiskLevel.VERY_HIGH) return "red";
        return "black"; // BLACKLISTED
    }

    function isRiskAnalysisRequired(address tokenContract, uint256 tokenId) 
        external view returns (bool) {
        bytes32 assetKey = keccak256(abi.encodePacked(tokenContract, tokenId));
        AssetRiskProfile memory profile = assetRiskProfiles[assetKey];
        
        return profile.lastUpdated == 0 || 
               block.timestamp - profile.lastUpdated > riskUpdateInterval;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
