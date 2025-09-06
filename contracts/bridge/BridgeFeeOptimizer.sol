// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title BridgeFeeOptimizer
 * @dev Dynamic fee calculation and gas estimation for cross-chain bridges
 * Uses Chainlink price feeds and historical gas data for optimization
 */
contract BridgeFeeOptimizer is 
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    struct ChainConfig {
        uint256 chainId;
        uint256 baseGasPrice;
        uint256 gasLimit;
        uint256 baseFee;
        uint256 priorityFee;
        address priceFeeds; // ETH/USD price feed
        uint256 confirmationBlocks;
        bool isActive;
    }

    struct FeeEstimate {
        uint256 baseFee;
        uint256 priorityFee;
        uint256 totalFee;
        uint256 estimatedTime;
        uint256 gasPrice;
        uint256 gasLimit;
    }

    struct GasHistory {
        uint256 timestamp;
        uint256 gasPrice;
        uint256 baseFee;
        uint256 priorityFee;
        uint256 utilization;
    }

    // State variables
    mapping(uint256 => ChainConfig) public chainConfigs;
    mapping(uint256 => GasHistory[]) public gasHistory;
    mapping(uint256 => mapping(uint256 => uint256)) public routeFees; // source => target => fee
    mapping(address => uint256) public discountTiers; // user => discount percentage
    
    uint256 public constant MAX_HISTORY_LENGTH = 100;
    uint256 public constant BASE_DISCOUNT = 10000; // 100% in basis points
    uint256 public platformFeePercentage; // in basis points
    address public feeRecipient;
    
    // Dynamic pricing parameters
    uint256 public congestionMultiplier;
    uint256 public volumeDiscountThreshold;
    uint256 public maxFeeMultiplier;
    uint256 public minFeeMultiplier;

    // Events
    event ChainConfigured(
        uint256 indexed chainId,
        uint256 baseGasPrice,
        uint256 gasLimit,
        address priceFeeds
    );
    
    event FeeEstimated(
        uint256 indexed sourceChain,
        uint256 indexed targetChain,
        address indexed user,
        uint256 baseFee,
        uint256 totalFee,
        uint256 estimatedTime
    );
    
    event GasDataUpdated(
        uint256 indexed chainId,
        uint256 gasPrice,
        uint256 baseFee,
        uint256 priorityFee,
        uint256 timestamp
    );
    
    event DiscountApplied(
        address indexed user,
        uint256 originalFee,
        uint256 discountedFee,
        uint256 discountPercentage
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        address _feeRecipient,
        uint256 _platformFeePercentage
    ) public initializer {
        __Ownable_init(initialOwner);
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        feeRecipient = _feeRecipient;
        platformFeePercentage = _platformFeePercentage;
        congestionMultiplier = 15000; // 150%
        volumeDiscountThreshold = 10; // 10 transactions
        maxFeeMultiplier = 30000; // 300%
        minFeeMultiplier = 5000; // 50%
        
        // Initialize default chain configs
        _initializeChainConfigs();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Get optimized fee estimate for cross-chain transfer
     */
    function getFeeEstimate(
        uint256 sourceChainId,
        uint256 targetChainId,
        address user,
        uint256 assetValue,
        bool isNFT
    ) external view returns (FeeEstimate memory) {
        ChainConfig memory sourceConfig = chainConfigs[sourceChainId];
        ChainConfig memory targetConfig = chainConfigs[targetChainId];
        
        require(sourceConfig.isActive && targetConfig.isActive, "Chain not supported");
        
        // Calculate base fees
        uint256 sourceBaseFee = _calculateBaseFee(sourceChainId, isNFT);
        uint256 targetBaseFee = _calculateBaseFee(targetChainId, isNFT);
        uint256 totalBaseFee = sourceBaseFee + targetBaseFee;
        
        // Apply dynamic pricing based on network congestion
        uint256 congestionFee = _calculateCongestionFee(sourceChainId, targetChainId);
        
        // Calculate priority fee for faster processing
        uint256 priorityFee = _calculatePriorityFee(sourceChainId, targetChainId);
        
        // Apply platform fee
        uint256 platformFee = (assetValue * platformFeePercentage) / 10000;
        
        // Calculate total fee before discounts
        uint256 totalFeeBeforeDiscount = totalBaseFee + congestionFee + priorityFee + platformFee;
        
        // Apply user discount
        uint256 discount = discountTiers[user];
        uint256 totalFee = totalFeeBeforeDiscount - ((totalFeeBeforeDiscount * discount) / 10000);
        
        // Estimate processing time
        uint256 estimatedTime = _estimateProcessingTime(sourceChainId, targetChainId);
        
        // Get current gas price
        uint256 gasPrice = _getCurrentGasPrice(sourceChainId);
        uint256 gasLimit = sourceConfig.gasLimit;
        
        return FeeEstimate({
            baseFee: totalBaseFee,
            priorityFee: priorityFee,
            totalFee: totalFee,
            estimatedTime: estimatedTime,
            gasPrice: gasPrice,
            gasLimit: gasLimit
        });
    }

    /**
     * @dev Update gas data for a chain
     */
    function updateGasData(
        uint256 chainId,
        uint256 gasPrice,
        uint256 baseFee,
        uint256 priorityFee,
        uint256 utilization
    ) external onlyOwner {
        GasHistory[] storage history = gasHistory[chainId];
        
        // Add new data point
        history.push(GasHistory({
            timestamp: block.timestamp,
            gasPrice: gasPrice,
            baseFee: baseFee,
            priorityFee: priorityFee,
            utilization: utilization
        }));
        
        // Keep only recent history
        if (history.length > MAX_HISTORY_LENGTH) {
            for (uint256 i = 0; i < history.length - 1; i++) {
                history[i] = history[i + 1];
            }
            history.pop();
        }
        
        emit GasDataUpdated(chainId, gasPrice, baseFee, priorityFee, block.timestamp);
    }

    /**
     * @dev Calculate base fee for a chain
     */
    function _calculateBaseFee(uint256 chainId, bool isNFT) internal view returns (uint256) {
        ChainConfig memory config = chainConfigs[chainId];
        uint256 baseFee = config.baseFee;
        
        // NFTs require more gas for metadata handling
        if (isNFT) {
            baseFee = (baseFee * 150) / 100; // 50% increase for NFTs
        }
        
        return baseFee;
    }

    /**
     * @dev Calculate congestion-based fee adjustment
     */
    function _calculateCongestionFee(uint256 sourceChainId, uint256 targetChainId) internal view returns (uint256) {
        uint256 sourceCongestion = _getNetworkCongestion(sourceChainId);
        uint256 targetCongestion = _getNetworkCongestion(targetChainId);
        uint256 avgCongestion = (sourceCongestion + targetCongestion) / 2;
        
        // Apply congestion multiplier
        uint256 baseFee = chainConfigs[sourceChainId].baseFee;
        uint256 congestionFee = (baseFee * avgCongestion * congestionMultiplier) / (100 * 10000);
        
        return congestionFee;
    }

    /**
     * @dev Calculate priority fee for faster processing
     */
    function _calculatePriorityFee(uint256 sourceChainId, uint256 targetChainId) internal view returns (uint256) {
        ChainConfig memory sourceConfig = chainConfigs[sourceChainId];
        ChainConfig memory targetConfig = chainConfigs[targetChainId];
        
        return sourceConfig.priorityFee + targetConfig.priorityFee;
    }

    /**
     * @dev Get network congestion percentage
     */
    function _getNetworkCongestion(uint256 chainId) internal view returns (uint256) {
        GasHistory[] storage history = gasHistory[chainId];
        if (history.length == 0) return 50; // Default 50% congestion
        
        // Calculate average utilization from recent history
        uint256 totalUtilization = 0;
        uint256 count = history.length > 10 ? 10 : history.length;
        
        for (uint256 i = history.length - count; i < history.length; i++) {
            totalUtilization += history[i].utilization;
        }
        
        return totalUtilization / count;
    }

    /**
     * @dev Estimate processing time based on network conditions
     */
    function _estimateProcessingTime(uint256 sourceChainId, uint256 targetChainId) internal view returns (uint256) {
        ChainConfig memory sourceConfig = chainConfigs[sourceChainId];
        ChainConfig memory targetConfig = chainConfigs[targetChainId];
        
        // Base time calculation
        uint256 baseTime = (sourceConfig.confirmationBlocks + targetConfig.confirmationBlocks) * 15; // 15 seconds per block average
        
        // Adjust for congestion
        uint256 congestion = (_getNetworkCongestion(sourceChainId) + _getNetworkCongestion(targetChainId)) / 2;
        uint256 congestionMultiplier = 100 + congestion; // 100% + congestion%
        
        return (baseTime * congestionMultiplier) / 100;
    }

    /**
     * @dev Get current gas price for a chain
     */
    function _getCurrentGasPrice(uint256 chainId) internal view returns (uint256) {
        GasHistory[] storage history = gasHistory[chainId];
        if (history.length == 0) {
            return chainConfigs[chainId].baseGasPrice;
        }
        
        return history[history.length - 1].gasPrice;
    }

    /**
     * @dev Initialize default chain configurations
     */
    function _initializeChainConfigs() internal {
        // Ethereum
        chainConfigs[1] = ChainConfig({
            chainId: 1,
            baseGasPrice: 20 gwei,
            gasLimit: 200000,
            baseFee: 0.01 ether,
            priorityFee: 0.005 ether,
            priceFeeds: address(0), // ETH/USD feed
            confirmationBlocks: 12,
            isActive: true
        });
        
        // Polygon
        chainConfigs[137] = ChainConfig({
            chainId: 137,
            baseGasPrice: 30 gwei,
            gasLimit: 200000,
            baseFee: 1 ether, // MATIC
            priorityFee: 0.5 ether,
            priceFeeds: address(0), // MATIC/USD feed
            confirmationBlocks: 20,
            isActive: true
        });
        
        // BSC
        chainConfigs[56] = ChainConfig({
            chainId: 56,
            baseGasPrice: 5 gwei,
            gasLimit: 200000,
            baseFee: 0.001 ether, // BNB
            priorityFee: 0.0005 ether,
            priceFeeds: address(0), // BNB/USD feed
            confirmationBlocks: 3,
            isActive: true
        });
        
        // OneChain Testnet
        chainConfigs[1001] = ChainConfig({
            chainId: 1001,
            baseGasPrice: 1 gwei,
            gasLimit: 200000,
            baseFee: 0.001 ether, // OCT
            priorityFee: 0.0005 ether,
            priceFeeds: address(0), // OCT/USD feed
            confirmationBlocks: 5,
            isActive: true
        });
        
        // OneChain Mainnet
        chainConfigs[1000] = ChainConfig({
            chainId: 1000,
            baseGasPrice: 1 gwei,
            gasLimit: 200000,
            baseFee: 0.001 ether, // OCT
            priorityFee: 0.0005 ether,
            priceFeeds: address(0), // OCT/USD feed
            confirmationBlocks: 5,
            isActive: true
        });
    }

    // Admin functions
    function configureChain(
        uint256 chainId,
        uint256 baseGasPrice,
        uint256 gasLimit,
        uint256 baseFee,
        uint256 priorityFee,
        address priceFeeds,
        uint256 confirmationBlocks,
        bool isActive
    ) external onlyOwner {
        chainConfigs[chainId] = ChainConfig({
            chainId: chainId,
            baseGasPrice: baseGasPrice,
            gasLimit: gasLimit,
            baseFee: baseFee,
            priorityFee: priorityFee,
            priceFeeds: priceFeeds,
            confirmationBlocks: confirmationBlocks,
            isActive: isActive
        });
        
        emit ChainConfigured(chainId, baseGasPrice, gasLimit, priceFeeds);
    }

    function setUserDiscount(address user, uint256 discountPercentage) external onlyOwner {
        require(discountPercentage <= 5000, "Discount too high"); // Max 50%
        discountTiers[user] = discountPercentage;
    }

    function setPlatformFee(uint256 _platformFeePercentage) external onlyOwner {
        require(_platformFeePercentage <= 1000, "Fee too high"); // Max 10%
        platformFeePercentage = _platformFeePercentage;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        feeRecipient = _feeRecipient;
    }

    function setCongestionMultiplier(uint256 _congestionMultiplier) external onlyOwner {
        congestionMultiplier = _congestionMultiplier;
    }

    // View functions
    function getChainConfig(uint256 chainId) external view returns (ChainConfig memory) {
        return chainConfigs[chainId];
    }

    function getRecentGasHistory(uint256 chainId, uint256 count) external view returns (GasHistory[] memory) {
        GasHistory[] storage history = gasHistory[chainId];
        uint256 length = history.length;
        uint256 returnCount = count > length ? length : count;
        
        GasHistory[] memory recentHistory = new GasHistory[](returnCount);
        for (uint256 i = 0; i < returnCount; i++) {
            recentHistory[i] = history[length - returnCount + i];
        }
        
        return recentHistory;
    }

    function getUserDiscount(address user) external view returns (uint256) {
        return discountTiers[user];
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
