// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title ChainlinkPriceManager
 * @dev Centralized price feed management for RWA assets using Chainlink oracles
 * Supports multiple asset types with fallback mechanisms and price validation
 */
contract ChainlinkPriceManager is 
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    struct PriceFeed {
        AggregatorV3Interface aggregator;
        uint256 decimals;
        uint256 heartbeat; // Maximum time between updates
        uint256 deviation; // Maximum price deviation percentage (in basis points)
        bool isActive;
        string description;
        uint256 lastValidPrice;
        uint256 lastValidTimestamp;
    }

    struct PriceData {
        uint256 price;
        uint256 timestamp;
        uint256 roundId;
        bool isValid;
        uint256 confidence; // Confidence score 0-10000 (basis points)
    }

    // State variables
    mapping(string => PriceFeed) public priceFeeds; // assetType => PriceFeed
    mapping(string => string[]) public assetCategories; // category => assetTypes[]
    mapping(string => PriceData) public latestPrices; // assetType => PriceData
    
    string[] public supportedAssets;
    uint256 public defaultHeartbeat;
    uint256 public defaultDeviation;
    uint256 public priceValidityDuration;
    
    // Events
    event PriceFeedAdded(
        string indexed assetType,
        address indexed aggregator,
        uint256 decimals,
        uint256 heartbeat
    );
    
    event PriceFeedUpdated(
        string indexed assetType,
        address indexed oldAggregator,
        address indexed newAggregator
    );
    
    event PriceUpdated(
        string indexed assetType,
        uint256 price,
        uint256 timestamp,
        uint256 roundId,
        uint256 confidence
    );
    
    event PriceFeedDeactivated(string indexed assetType, string reason);
    
    event FallbackPriceUsed(
        string indexed assetType,
        uint256 fallbackPrice,
        string reason
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        defaultHeartbeat = 3600; // 1 hour
        defaultDeviation = 1000; // 10%
        priceValidityDuration = 7200; // 2 hours
        
        _initializeDefaultFeeds();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Add a new price feed for an asset type
     */
    function addPriceFeed(
        string memory assetType,
        address aggregator,
        uint256 decimals,
        uint256 heartbeat,
        uint256 deviation,
        string memory description
    ) external onlyOwner {
        require(aggregator != address(0), "Invalid aggregator address");
        require(bytes(assetType).length > 0, "Asset type cannot be empty");
        require(heartbeat > 0, "Heartbeat must be positive");
        require(deviation <= 5000, "Deviation too high"); // Max 50%
        
        // Validate the aggregator by calling latestRoundData
        AggregatorV3Interface feed = AggregatorV3Interface(aggregator);
        try feed.latestRoundData() returns (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            require(price > 0, "Invalid price from aggregator");
            require(updatedAt > 0, "Invalid timestamp from aggregator");
        } catch {
            revert("Aggregator validation failed");
        }
        
        priceFeeds[assetType] = PriceFeed({
            aggregator: feed,
            decimals: decimals,
            heartbeat: heartbeat,
            deviation: deviation,
            isActive: true,
            description: description,
            lastValidPrice: 0,
            lastValidTimestamp: 0
        });
        
        // Add to supported assets if not already present
        bool exists = false;
        for (uint256 i = 0; i < supportedAssets.length; i++) {
            if (keccak256(bytes(supportedAssets[i])) == keccak256(bytes(assetType))) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            supportedAssets.push(assetType);
        }
        
        emit PriceFeedAdded(assetType, aggregator, decimals, heartbeat);
    }

    /**
     * @dev Get the latest price for an asset type with validation
     */
    function getLatestPrice(string memory assetType) external view returns (PriceData memory) {
        PriceFeed storage feed = priceFeeds[assetType];
        require(feed.isActive, "Price feed not active");
        
        try feed.aggregator.latestRoundData() returns (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            // Validate price data
            bool isValid = _validatePriceData(assetType, price, updatedAt, roundId);
            uint256 confidence = _calculateConfidence(assetType, price, updatedAt);
            
            return PriceData({
                price: uint256(price),
                timestamp: updatedAt,
                roundId: roundId,
                isValid: isValid,
                confidence: confidence
            });
        } catch {
            // Return fallback price if available
            if (feed.lastValidPrice > 0 && 
                block.timestamp - feed.lastValidTimestamp <= priceValidityDuration) {
                return PriceData({
                    price: feed.lastValidPrice,
                    timestamp: feed.lastValidTimestamp,
                    roundId: 0,
                    isValid: false,
                    confidence: 5000 // 50% confidence for fallback
                });
            }
            
            revert("No valid price available");
        }
    }

    /**
     * @dev Update and cache the latest price for an asset type
     */
    function updatePrice(string memory assetType) external whenNotPaused returns (bool success) {
        PriceFeed storage feed = priceFeeds[assetType];
        require(feed.isActive, "Price feed not active");
        
        try feed.aggregator.latestRoundData() returns (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            bool isValid = _validatePriceData(assetType, price, updatedAt, roundId);
            uint256 confidence = _calculateConfidence(assetType, price, updatedAt);
            
            // Update cached price data
            latestPrices[assetType] = PriceData({
                price: uint256(price),
                timestamp: updatedAt,
                roundId: roundId,
                isValid: isValid,
                confidence: confidence
            });
            
            // Update last valid price if current price is valid
            if (isValid) {
                feed.lastValidPrice = uint256(price);
                feed.lastValidTimestamp = updatedAt;
            }
            
            emit PriceUpdated(assetType, uint256(price), updatedAt, roundId, confidence);
            return true;
        } catch Error(string memory reason) {
            emit PriceFeedDeactivated(assetType, reason);
            return false;
        } catch {
            emit PriceFeedDeactivated(assetType, "Unknown error");
            return false;
        }
    }

    /**
     * @dev Batch update prices for multiple asset types
     */
    function batchUpdatePrices(string[] memory assetTypes) external whenNotPaused returns (bool[] memory results) {
        results = new bool[](assetTypes.length);
        
        for (uint256 i = 0; i < assetTypes.length; i++) {
            results[i] = this.updatePrice(assetTypes[i]);
        }
        
        return results;
    }

    /**
     * @dev Get cached price data (gas efficient)
     */
    function getCachedPrice(string memory assetType) external view returns (PriceData memory) {
        PriceData memory cached = latestPrices[assetType];
        require(cached.timestamp > 0, "No cached price available");
        
        // Check if cached price is still valid
        PriceFeed storage feed = priceFeeds[assetType];
        if (block.timestamp - cached.timestamp > feed.heartbeat) {
            cached.isValid = false;
            cached.confidence = cached.confidence / 2; // Reduce confidence for stale data
        }
        
        return cached;
    }

    /**
     * @dev Validate price data from Chainlink feed
     */
    function _validatePriceData(
        string memory assetType,
        int256 price,
        uint256 updatedAt,
        uint256 roundId
    ) internal view returns (bool) {
        PriceFeed storage feed = priceFeeds[assetType];
        
        // Basic validation
        if (price <= 0) return false;
        if (updatedAt == 0) return false;
        if (block.timestamp - updatedAt > feed.heartbeat) return false;
        
        // Price deviation check
        if (feed.lastValidPrice > 0) {
            uint256 currentPrice = uint256(price);
            uint256 lastPrice = feed.lastValidPrice;
            uint256 deviation;
            
            if (currentPrice > lastPrice) {
                deviation = ((currentPrice - lastPrice) * 10000) / lastPrice;
            } else {
                deviation = ((lastPrice - currentPrice) * 10000) / lastPrice;
            }
            
            if (deviation > feed.deviation) return false;
        }
        
        return true;
    }

    /**
     * @dev Calculate confidence score for price data
     */
    function _calculateConfidence(
        string memory assetType,
        int256 price,
        uint256 updatedAt
    ) internal view returns (uint256) {
        PriceFeed storage feed = priceFeeds[assetType];
        uint256 confidence = 10000; // Start with 100% confidence
        
        // Reduce confidence based on data age
        uint256 age = block.timestamp - updatedAt;
        if (age > feed.heartbeat / 2) {
            confidence = confidence - ((age * 2000) / feed.heartbeat); // Reduce up to 20%
        }
        
        // Reduce confidence for large price deviations
        if (feed.lastValidPrice > 0) {
            uint256 currentPrice = uint256(price);
            uint256 lastPrice = feed.lastValidPrice;
            uint256 deviation;
            
            if (currentPrice > lastPrice) {
                deviation = ((currentPrice - lastPrice) * 10000) / lastPrice;
            } else {
                deviation = ((lastPrice - currentPrice) * 10000) / lastPrice;
            }
            
            if (deviation > 500) { // 5% deviation
                confidence = confidence - (deviation / 10); // Reduce confidence
            }
        }
        
        return confidence > 10000 ? 10000 : confidence;
    }

    /**
     * @dev Initialize default price feeds for common RWA asset types
     */
    function _initializeDefaultFeeds() internal {
        // Note: These are example addresses - replace with actual Chainlink feed addresses
        
        // ETH/USD for Real Estate (proxy)
        // priceFeeds["Real Estate"] = PriceFeed({
        //     aggregator: AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419),
        //     decimals: 8,
        //     heartbeat: 3600,
        //     deviation: 1000,
        //     isActive: false, // Disabled by default
        //     description: "ETH/USD Price Feed (Real Estate Proxy)",
        //     lastValidPrice: 0,
        //     lastValidTimestamp: 0
        // });
    }

    // Admin functions
    function updatePriceFeed(
        string memory assetType,
        address newAggregator,
        uint256 decimals,
        uint256 heartbeat,
        uint256 deviation,
        string memory description
    ) external onlyOwner {
        require(priceFeeds[assetType].isActive, "Price feed does not exist");
        
        address oldAggregator = address(priceFeeds[assetType].aggregator);
        
        priceFeeds[assetType].aggregator = AggregatorV3Interface(newAggregator);
        priceFeeds[assetType].decimals = decimals;
        priceFeeds[assetType].heartbeat = heartbeat;
        priceFeeds[assetType].deviation = deviation;
        priceFeeds[assetType].description = description;
        
        emit PriceFeedUpdated(assetType, oldAggregator, newAggregator);
    }

    function deactivatePriceFeed(string memory assetType, string memory reason) external onlyOwner {
        require(priceFeeds[assetType].isActive, "Price feed already inactive");
        priceFeeds[assetType].isActive = false;
        emit PriceFeedDeactivated(assetType, reason);
    }

    function activatePriceFeed(string memory assetType) external onlyOwner {
        require(!priceFeeds[assetType].isActive, "Price feed already active");
        priceFeeds[assetType].isActive = true;
    }

    function setDefaultParameters(
        uint256 _defaultHeartbeat,
        uint256 _defaultDeviation,
        uint256 _priceValidityDuration
    ) external onlyOwner {
        defaultHeartbeat = _defaultHeartbeat;
        defaultDeviation = _defaultDeviation;
        priceValidityDuration = _priceValidityDuration;
    }

    // View functions
    function getPriceFeedInfo(string memory assetType) external view returns (PriceFeed memory) {
        return priceFeeds[assetType];
    }

    function getSupportedAssets() external view returns (string[] memory) {
        return supportedAssets;
    }

    function isPriceFeedActive(string memory assetType) external view returns (bool) {
        return priceFeeds[assetType].isActive;
    }

    function getMultiplePrices(string[] memory assetTypes) external view returns (PriceData[] memory) {
        PriceData[] memory prices = new PriceData[](assetTypes.length);
        
        for (uint256 i = 0; i < assetTypes.length; i++) {
            try this.getLatestPrice(assetTypes[i]) returns (PriceData memory priceData) {
                prices[i] = priceData;
            } catch {
                // Return empty price data for failed requests
                prices[i] = PriceData({
                    price: 0,
                    timestamp: 0,
                    roundId: 0,
                    isValid: false,
                    confidence: 0
                });
            }
        }
        
        return prices;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
