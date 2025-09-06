// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title RWARegistry
 * @dev Central registry for all Real World Assets across chains
 * Manages asset types, compliance, and cross-chain asset tracking
 */
contract RWARegistry is 
    Initializable, 
    OwnableUpgradeable, 
    PausableUpgradeable, 
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable 
{
    // Asset Types
    enum AssetType { 
        REAL_ESTATE, 
        CARBON_CREDITS, 
        COMMODITIES, 
        PRECIOUS_METALS, 
        BONDS, 
        STOCKS,
        INTELLECTUAL_PROPERTY,
        RENEWABLE_ENERGY
    }

    // Asset Status
    enum AssetStatus { 
        PENDING, 
        VERIFIED, 
        ACTIVE, 
        SUSPENDED, 
        DEPRECATED 
    }

    // Compliance Levels
    enum ComplianceLevel { 
        BASIC, 
        KYC_VERIFIED, 
        ACCREDITED_INVESTOR, 
        INSTITUTIONAL 
    }

    struct RWAAsset {
        uint256 assetId;
        AssetType assetType;
        AssetStatus status;
        ComplianceLevel requiredCompliance;
        address tokenContract;
        uint256 chainId;
        string metadataURI;
        address verifier;
        uint256 verificationTimestamp;
        uint256 totalValue; // In USD with 18 decimals
        uint256 totalSupply;
        bool isFractionalized;
        address fractionalContract;
    }

    struct ChainInfo {
        uint256 chainId;
        string name;
        bool isActive;
        address bridgeContract;
        uint256 minBridgeAmount;
        uint256 bridgeFee;
    }

    // State variables
    uint256 private _nextAssetId;
    mapping(uint256 => RWAAsset) public assets;
    mapping(uint256 => mapping(address => bool)) public assetOperators;
    mapping(address => mapping(AssetType => bool)) public verifiers;
    mapping(address => ComplianceLevel) public userCompliance;
    mapping(uint256 => ChainInfo) public supportedChains;
    mapping(address => bool) public authorizedBridges;
    
    // Cross-chain asset tracking
    mapping(uint256 => mapping(uint256 => address)) public crossChainAssets;
    mapping(bytes32 => bool) public processedBridgeTransactions;

    // Events
    event AssetRegistered(
        uint256 indexed assetId,
        AssetType indexed assetType,
        address indexed tokenContract,
        uint256 chainId,
        address verifier
    );
    
    event AssetStatusUpdated(
        uint256 indexed assetId,
        AssetStatus oldStatus,
        AssetStatus newStatus,
        address updatedBy
    );
    
    event AssetFractionalized(
        uint256 indexed assetId,
        address fractionalContract,
        uint256 totalFractions
    );
    
    event CrossChainAssetDeployed(
        uint256 indexed assetId,
        uint256 sourceChainId,
        uint256 targetChainId,
        address targetContract
    );
    
    event ComplianceUpdated(
        address indexed user,
        ComplianceLevel oldLevel,
        ComplianceLevel newLevel
    );
    
    event ChainAdded(
        uint256 indexed chainId,
        string name,
        address bridgeContract
    );

    // Modifiers
    modifier onlyVerifier(AssetType assetType) {
        require(verifiers[msg.sender][assetType], "Not authorized verifier");
        _;
    }

    modifier onlyAuthorizedBridge() {
        require(authorizedBridges[msg.sender], "Not authorized bridge");
        _;
    }

    modifier validAsset(uint256 assetId) {
        require(assetId < _nextAssetId, "Asset does not exist");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        _nextAssetId = 1;
        
        // Initialize supported chains
        _addChain(1, "Ethereum", address(0));
        _addChain(137, "Polygon", address(0));
        _addChain(56, "BSC", address(0));
        _addChain(1001, "OneChain Testnet", address(0));
        _addChain(1000, "OneChain Mainnet", address(0));
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Register a new RWA asset
     */
    function registerAsset(
        AssetType assetType,
        address tokenContract,
        uint256 chainId,
        string memory metadataURI,
        uint256 totalValue,
        uint256 totalSupply,
        ComplianceLevel requiredCompliance
    ) external onlyVerifier(assetType) whenNotPaused returns (uint256) {
        require(supportedChains[chainId].isActive, "Chain not supported");
        require(bytes(metadataURI).length > 0, "Metadata URI required");
        require(totalValue > 0, "Total value must be positive");
        require(totalSupply > 0, "Total supply must be positive");

        uint256 assetId = _nextAssetId++;
        RWAAsset storage asset = assets[assetId];
        
        asset.assetId = assetId;
        asset.assetType = assetType;
        asset.status = AssetStatus.PENDING;
        asset.requiredCompliance = requiredCompliance;
        asset.tokenContract = tokenContract;
        asset.chainId = chainId;
        asset.metadataURI = metadataURI;
        asset.verifier = msg.sender;
        asset.verificationTimestamp = block.timestamp;
        asset.totalValue = totalValue;
        asset.totalSupply = totalSupply;
        asset.isFractionalized = false;

        emit AssetRegistered(assetId, assetType, tokenContract, chainId, msg.sender);
        return assetId;
    }

    /**
     * @dev Update asset status
     */
    function updateAssetStatus(
        uint256 assetId,
        AssetStatus newStatus
    ) external validAsset(assetId) whenNotPaused {
        RWAAsset storage asset = assets[assetId];
        require(
            msg.sender == asset.verifier || msg.sender == owner(),
            "Not authorized to update status"
        );

        AssetStatus oldStatus = asset.status;
        asset.status = newStatus;

        emit AssetStatusUpdated(assetId, oldStatus, newStatus, msg.sender);
    }

    /**
     * @dev Mark asset as fractionalized
     */
    function setAssetFractionalized(
        uint256 assetId,
        address fractionalContract,
        uint256 totalFractions
    ) external validAsset(assetId) whenNotPaused {
        RWAAsset storage asset = assets[assetId];
        require(
            assetOperators[assetId][msg.sender] || 
            msg.sender == asset.verifier || 
            msg.sender == owner(),
            "Not authorized"
        );
        require(!asset.isFractionalized, "Already fractionalized");

        asset.isFractionalized = true;
        asset.fractionalContract = fractionalContract;

        emit AssetFractionalized(assetId, fractionalContract, totalFractions);
    }

    /**
     * @dev Add cross-chain asset deployment
     */
    function addCrossChainAsset(
        uint256 assetId,
        uint256 targetChainId,
        address targetContract
    ) external onlyAuthorizedBridge validAsset(assetId) {
        require(supportedChains[targetChainId].isActive, "Target chain not supported");
        require(targetContract != address(0), "Invalid target contract");

        crossChainAssets[assetId][targetChainId] = targetContract;

        emit CrossChainAssetDeployed(
            assetId,
            assets[assetId].chainId,
            targetChainId,
            targetContract
        );
    }

    /**
     * @dev Internal function to add chain
     */
    function _addChain(
        uint256 chainId,
        string memory name,
        address bridgeContract
    ) internal {
        supportedChains[chainId] = ChainInfo({
            chainId: chainId,
            name: name,
            isActive: true,
            bridgeContract: bridgeContract,
            minBridgeAmount: 0,
            bridgeFee: 0
        });

        emit ChainAdded(chainId, name, bridgeContract);
    }

    // View functions
    function getAsset(uint256 assetId) external view validAsset(assetId) returns (RWAAsset memory) {
        return assets[assetId];
    }

    function getNextAssetId() external view returns (uint256) {
        return _nextAssetId;
    }

    function isAssetOperator(uint256 assetId, address operator) external view returns (bool) {
        return assetOperators[assetId][operator];
    }

    function getCrossChainAsset(uint256 assetId, uint256 chainId) external view returns (address) {
        return crossChainAssets[assetId][chainId];
    }

    // Admin functions
    function updateUserCompliance(address user, ComplianceLevel newLevel) external onlyOwner {
        ComplianceLevel oldLevel = userCompliance[user];
        userCompliance[user] = newLevel;
        emit ComplianceUpdated(user, oldLevel, newLevel);
    }

    function addVerifier(address verifier, AssetType assetType) external onlyOwner {
        verifiers[verifier][assetType] = true;
    }

    function removeVerifier(address verifier, AssetType assetType) external onlyOwner {
        verifiers[verifier][assetType] = false;
    }

    function addAuthorizedBridge(address bridge) external onlyOwner {
        authorizedBridges[bridge] = true;
    }

    function removeAuthorizedBridge(address bridge) external onlyOwner {
        authorizedBridges[bridge] = false;
    }

    function setAssetOperator(uint256 assetId, address operator, bool authorized) external validAsset(assetId) {
        require(msg.sender == assets[assetId].verifier || msg.sender == owner(), "Not authorized");
        assetOperators[assetId][operator] = authorized;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
