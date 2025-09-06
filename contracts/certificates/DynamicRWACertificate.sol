// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title DynamicRWACertificate
 * @dev Dynamic NFT certificates for RWA fractional ownership with real-time updates
 * Uses Chainlink oracles for live pricing and automated metadata updates
 */
contract DynamicRWACertificate is 
    Initializable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    AutomationCompatibleInterface
{
    struct CertificateData {
        uint256 tokenId;
        address underlyingAsset;
        uint256 underlyingTokenId;
        uint256 fractionAmount;
        uint256 totalFractions;
        uint256 lastPriceUpdate;
        uint256 currentPrice;
        uint256 riskScore;
        string assetType;
        string location;
        bool isActive;
        uint256 createdAt;
        uint256 lastRiskUpdate;
    }

    struct PriceOracle {
        AggregatorV3Interface priceFeed;
        uint256 decimals;
        uint256 heartbeat;
        bool isActive;
        string description;
    }

    struct MetadataTemplate {
        string name;
        string description;
        string imageBase;
        string animationUrl;
        string externalUrl;
        mapping(string => string) attributes;
    }

    // State variables
    mapping(uint256 => CertificateData) public certificates;
    mapping(string => PriceOracle) public priceOracles; // asset type => oracle
    mapping(uint256 => string) public certificateMetadata; // tokenId => metadata JSON
    mapping(address => bool) public authorizedUpdaters;
    mapping(string => MetadataTemplate) public metadataTemplates;
    
    uint256 private _nextTokenId;
    uint256 public updateInterval;
    uint256 public lastUpkeepTimestamp;
    string public baseMetadataURI;
    address public riskEngineContract;
    
    // Constants
    uint256 public constant PRICE_STALENESS_THRESHOLD = 3600; // 1 hour
    uint256 public constant RISK_UPDATE_INTERVAL = 1800; // 30 minutes
    uint256 public constant MAX_CERTIFICATES_PER_UPKEEP = 50;

    // Events
    event CertificateIssued(
        uint256 indexed tokenId,
        address indexed owner,
        address indexed underlyingAsset,
        uint256 underlyingTokenId,
        uint256 fractionAmount,
        uint256 totalFractions
    );
    
    event PriceUpdated(
        uint256 indexed tokenId,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 timestamp
    );
    
    event RiskScoreUpdated(
        uint256 indexed tokenId,
        uint256 oldRiskScore,
        uint256 newRiskScore,
        uint256 timestamp
    );
    
    event MetadataUpdated(
        uint256 indexed tokenId,
        string newMetadata,
        uint256 timestamp
    );
    
    event OracleConfigured(
        string indexed assetType,
        address priceFeed,
        uint256 decimals,
        uint256 heartbeat
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory name,
        string memory symbol,
        address initialOwner,
        string memory _baseMetadataURI
    ) public initializer {
        __ERC721_init(name, symbol);
        __ERC721URIStorage_init();
        __Ownable_init(initialOwner);
        __Pausable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        _nextTokenId = 1;
        updateInterval = 300; // 5 minutes
        baseMetadataURI = _baseMetadataURI;
        
        _initializeMetadataTemplates();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Issue a new dynamic certificate for RWA fractions
     */
    function issueCertificate(
        address to,
        address underlyingAsset,
        uint256 underlyingTokenId,
        uint256 fractionAmount,
        uint256 totalFractions,
        string memory assetType,
        string memory location
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        
        // Mint the certificate NFT
        _safeMint(to, tokenId);
        
        // Initialize certificate data
        certificates[tokenId] = CertificateData({
            tokenId: tokenId,
            underlyingAsset: underlyingAsset,
            underlyingTokenId: underlyingTokenId,
            fractionAmount: fractionAmount,
            totalFractions: totalFractions,
            lastPriceUpdate: block.timestamp,
            currentPrice: 0,
            riskScore: 500, // Default medium risk
            assetType: assetType,
            location: location,
            isActive: true,
            createdAt: block.timestamp,
            lastRiskUpdate: block.timestamp
        });
        
        // Generate initial metadata
        _updateMetadata(tokenId);
        
        emit CertificateIssued(
            tokenId,
            to,
            underlyingAsset,
            underlyingTokenId,
            fractionAmount,
            totalFractions
        );
        
        return tokenId;
    }

    /**
     * @dev Update price for a specific certificate using Chainlink oracle
     */
    function updatePrice(uint256 tokenId) public {
        require(_exists(tokenId), "Certificate does not exist");
        
        CertificateData storage cert = certificates[tokenId];
        require(cert.isActive, "Certificate is not active");
        
        PriceOracle storage oracle = priceOracles[cert.assetType];
        require(oracle.isActive, "Oracle not configured for asset type");
        
        // Get latest price from Chainlink
        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = oracle.priceFeed.latestRoundData();
        
        require(price > 0, "Invalid price from oracle");
        require(updatedAt > 0, "Price data is stale");
        require(block.timestamp - updatedAt <= oracle.heartbeat, "Price data too old");
        
        uint256 oldPrice = cert.currentPrice;
        cert.currentPrice = uint256(price);
        cert.lastPriceUpdate = block.timestamp;
        
        // Update metadata with new price
        _updateMetadata(tokenId);
        
        emit PriceUpdated(tokenId, oldPrice, cert.currentPrice, block.timestamp);
    }

    /**
     * @dev Update risk score for a certificate
     */
    function updateRiskScore(uint256 tokenId, uint256 newRiskScore) external {
        require(
            msg.sender == riskEngineContract || 
            authorizedUpdaters[msg.sender] || 
            msg.sender == owner(),
            "Unauthorized"
        );
        require(_exists(tokenId), "Certificate does not exist");
        require(newRiskScore <= 1000, "Risk score too high");
        
        CertificateData storage cert = certificates[tokenId];
        uint256 oldRiskScore = cert.riskScore;
        cert.riskScore = newRiskScore;
        cert.lastRiskUpdate = block.timestamp;
        
        // Update metadata with new risk score
        _updateMetadata(tokenId);
        
        emit RiskScoreUpdated(tokenId, oldRiskScore, newRiskScore, block.timestamp);
    }

    /**
     * @dev Generate dynamic metadata JSON for a certificate
     */
    function _updateMetadata(uint256 tokenId) internal {
        CertificateData storage cert = certificates[tokenId];
        MetadataTemplate storage template = metadataTemplates[cert.assetType];
        
        // Calculate ownership percentage
        uint256 ownershipPercentage = (cert.fractionAmount * 10000) / cert.totalFractions; // in basis points
        
        // Determine risk level and color
        (string memory riskLevel, string memory riskColor) = _getRiskLevelAndColor(cert.riskScore);
        
        // Generate dynamic attributes
        string memory attributes = string(abi.encodePacked(
            '[',
            '{"trait_type": "Asset Type", "value": "', cert.assetType, '"},',
            '{"trait_type": "Location", "value": "', cert.location, '"},',
            '{"trait_type": "Ownership Percentage", "value": ', _toString(ownershipPercentage / 100), ', "display_type": "number", "max_value": 100},',
            '{"trait_type": "Fraction Amount", "value": ', _toString(cert.fractionAmount), ', "display_type": "number"},',
            '{"trait_type": "Total Fractions", "value": ', _toString(cert.totalFractions), ', "display_type": "number"},',
            '{"trait_type": "Current Price", "value": ', _toString(cert.currentPrice), ', "display_type": "number"},',
            '{"trait_type": "Risk Score", "value": ', _toString(cert.riskScore), ', "display_type": "number", "max_value": 1000},',
            '{"trait_type": "Risk Level", "value": "', riskLevel, '"},',
            '{"trait_type": "Last Updated", "value": ', _toString(block.timestamp), ', "display_type": "date"},',
            '{"trait_type": "Certificate ID", "value": "', _toString(tokenId), '"}',
            ']'
        ));
        
        // Generate complete metadata JSON
        string memory metadata = string(abi.encodePacked(
            '{',
            '"name": "RWA Certificate #', _toString(tokenId), ' - ', cert.assetType, '",',
            '"description": "Dynamic NFT certificate representing fractional ownership of real-world asset. This certificate updates in real-time with asset value, market prices, and risk assessments.",',
            '"image": "', template.imageBase, _toString(tokenId), '.png",',
            '"animation_url": "', template.animationUrl, _toString(tokenId), '.html",',
            '"external_url": "', template.externalUrl, _toString(tokenId), '",',
            '"attributes": ', attributes, ',',
            '"properties": {',
            '"underlying_asset": "', _addressToString(cert.underlyingAsset), '",',
            '"underlying_token_id": ', _toString(cert.underlyingTokenId), ',',
            '"created_at": ', _toString(cert.createdAt), ',',
            '"last_price_update": ', _toString(cert.lastPriceUpdate), ',',
            '"last_risk_update": ', _toString(cert.lastRiskUpdate), ',',
            '"is_active": ', cert.isActive ? 'true' : 'false',
            '}',
            '}'
        ));
        
        certificateMetadata[tokenId] = metadata;
        emit MetadataUpdated(tokenId, metadata, block.timestamp);
    }

    /**
     * @dev Get risk level string and color from risk score
     */
    function _getRiskLevelAndColor(uint256 riskScore) internal pure returns (string memory level, string memory color) {
        if (riskScore <= 100) return ("Very Low", "green");
        if (riskScore <= 250) return ("Low", "blue");
        if (riskScore <= 500) return ("Medium", "yellow");
        if (riskScore <= 750) return ("High", "orange");
        if (riskScore <= 900) return ("Very High", "red");
        return ("Critical", "black");
    }

    /**
     * @dev Chainlink Automation compatible function for automated updates
     */
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
        // Check if enough time has passed since last upkeep
        if (block.timestamp - lastUpkeepTimestamp < updateInterval) {
            return (false, "");
        }
        
        // Find certificates that need updates
        uint256[] memory tokensToUpdate = new uint256[](MAX_CERTIFICATES_PER_UPKEEP);
        uint256 count = 0;
        
        for (uint256 i = 1; i < _nextTokenId && count < MAX_CERTIFICATES_PER_UPKEEP; i++) {
            if (_exists(i)) {
                CertificateData storage cert = certificates[i];
                
                // Check if price update is needed
                bool needsPriceUpdate = block.timestamp - cert.lastPriceUpdate > PRICE_STALENESS_THRESHOLD;
                
                // Check if risk update is needed
                bool needsRiskUpdate = block.timestamp - cert.lastRiskUpdate > RISK_UPDATE_INTERVAL;
                
                if (cert.isActive && (needsPriceUpdate || needsRiskUpdate)) {
                    tokensToUpdate[count] = i;
                    count++;
                }
            }
        }
        
        if (count > 0) {
            // Resize array to actual count
            uint256[] memory finalTokens = new uint256[](count);
            for (uint256 i = 0; i < count; i++) {
                finalTokens[i] = tokensToUpdate[i];
            }
            
            return (true, abi.encode(finalTokens));
        }
        
        return (false, "");
    }

    /**
     * @dev Perform automated upkeep
     */
    function performUpkeep(bytes calldata performData) external override {
        uint256[] memory tokensToUpdate = abi.decode(performData, (uint256[]));
        
        for (uint256 i = 0; i < tokensToUpdate.length; i++) {
            uint256 tokenId = tokensToUpdate[i];
            
            if (_exists(tokenId) && certificates[tokenId].isActive) {
                // Update price if oracle is available
                PriceOracle storage oracle = priceOracles[certificates[tokenId].assetType];
                if (oracle.isActive) {
                    try this.updatePrice(tokenId) {} catch {}
                }
                
                // Update metadata
                _updateMetadata(tokenId);
            }
        }
        
        lastUpkeepTimestamp = block.timestamp;
    }

    /**
     * @dev Initialize metadata templates for different asset types
     */
    function _initializeMetadataTemplates() internal {
        // Real Estate template
        MetadataTemplate storage realEstate = metadataTemplates["Real Estate"];
        realEstate.name = "Real Estate Certificate";
        realEstate.description = "Fractional ownership certificate for real estate property";
        realEstate.imageBase = "https://certificates.omniflow.io/images/real-estate/";
        realEstate.animationUrl = "https://certificates.omniflow.io/animations/real-estate/";
        realEstate.externalUrl = "https://omniflow.io/certificate/";
        
        // Carbon Credits template
        MetadataTemplate storage carbonCredits = metadataTemplates["Carbon Credits"];
        carbonCredits.name = "Carbon Credits Certificate";
        carbonCredits.description = "Fractional ownership certificate for carbon credit assets";
        carbonCredits.imageBase = "https://certificates.omniflow.io/images/carbon/";
        carbonCredits.animationUrl = "https://certificates.omniflow.io/animations/carbon/";
        carbonCredits.externalUrl = "https://omniflow.io/certificate/";
        
        // Precious Metals template
        MetadataTemplate storage preciousMetals = metadataTemplates["Precious Metals"];
        preciousMetals.name = "Precious Metals Certificate";
        preciousMetals.description = "Fractional ownership certificate for precious metals";
        preciousMetals.imageBase = "https://certificates.omniflow.io/images/metals/";
        preciousMetals.animationUrl = "https://certificates.omniflow.io/animations/metals/";
        preciousMetals.externalUrl = "https://omniflow.io/certificate/";
    }

    // Admin functions
    function configurePriceOracle(
        string memory assetType,
        address priceFeed,
        uint256 decimals,
        uint256 heartbeat,
        string memory description
    ) external onlyOwner {
        priceOracles[assetType] = PriceOracle({
            priceFeed: AggregatorV3Interface(priceFeed),
            decimals: decimals,
            heartbeat: heartbeat,
            isActive: true,
            description: description
        });
        
        emit OracleConfigured(assetType, priceFeed, decimals, heartbeat);
    }

    function setRiskEngineContract(address _riskEngineContract) external onlyOwner {
        riskEngineContract = _riskEngineContract;
    }

    function addAuthorizedUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = true;
    }

    function removeAuthorizedUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = false;
    }

    function setUpdateInterval(uint256 _updateInterval) external onlyOwner {
        updateInterval = _updateInterval;
    }

    function deactivateCertificate(uint256 tokenId) external onlyOwner {
        require(_exists(tokenId), "Certificate does not exist");
        certificates[tokenId].isActive = false;
        _updateMetadata(tokenId);
    }

    // View functions
    function getCertificateData(uint256 tokenId) external view returns (CertificateData memory) {
        require(_exists(tokenId), "Certificate does not exist");
        return certificates[tokenId];
    }

    function getCertificateMetadata(uint256 tokenId) external view returns (string memory) {
        require(_exists(tokenId), "Certificate does not exist");
        return certificateMetadata[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
        require(_exists(tokenId), "Certificate does not exist");
        
        // Return data URI with JSON metadata
        string memory json = certificateMetadata[tokenId];
        return string(abi.encodePacked(
            "data:application/json;base64,",
            _base64Encode(bytes(json))
        ));
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId) internal override(ERC721Upgradeable, ERC721URIStorageUpgradeable) {
        super._burn(tokenId);
        delete certificates[tokenId];
        delete certificateMetadata[tokenId];
    }

    // Utility functions
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }

    function _addressToString(address addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        
        return string(str);
    }

    function _base64Encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        
        string memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLen + 32);
        
        assembly {
            let tablePtr := add(table, 1)
            let dataPtr := data
            let endPtr := add(dataPtr, mload(data))
            let resultPtr := add(result, 32)
            
            for {} lt(dataPtr, endPtr) {}
            {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)
                
                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr( 6, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(        input,  0x3F))))
                resultPtr := add(resultPtr, 1)
            }
            
            switch mod(mload(data), 3)
            case 1 { mstore(sub(resultPtr, 2), shl(240, 0x3d3d)) }
            case 2 { mstore(sub(resultPtr, 1), shl(248, 0x3d)) }
            
            mstore(result, encodedLen)
        }
        
        return result;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
