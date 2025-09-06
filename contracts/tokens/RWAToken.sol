// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IRWARegistry.sol";

/**
 * @title RWAToken
 * @dev ERC721 token representing Real World Assets with enhanced features
 * Supports cross-chain compatibility, compliance, and fractionalization
 */
contract RWAToken is 
    Initializable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    ERC721BurnableUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    IRWARegistry public rwaRegistry;
    
    struct TokenInfo {
        uint256 assetId; // Reference to RWARegistry
        uint256 mintTimestamp;
        address originalMinter;
        bool isTransferable;
        uint256 lastTransferTimestamp;
        mapping(address => bool) authorizedTransferees;
    }

    mapping(uint256 => TokenInfo) public tokenInfo;
    mapping(address => bool) public authorizedMinters;
    mapping(uint256 => bool) public frozenTokens;
    
    uint256 private _nextTokenId;
    string private _baseTokenURI;
    
    // Cross-chain support
    mapping(uint256 => mapping(uint256 => bool)) public crossChainMinted;
    mapping(bytes32 => bool) public processedCrossChainTx;

    // Events
    event TokenMinted(
        uint256 indexed tokenId,
        uint256 indexed assetId,
        address indexed to,
        string tokenURI
    );
    
    event TokenFrozen(uint256 indexed tokenId, address indexed freezer);
    event TokenUnfrozen(uint256 indexed tokenId, address indexed unfreezer);
    
    event CrossChainMint(
        uint256 indexed tokenId,
        uint256 sourceChainId,
        uint256 targetChainId,
        bytes32 txHash
    );
    
    event ComplianceTransfer(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        bool complianceChecked
    );

    // Modifiers
    modifier onlyAuthorizedMinter() {
        require(authorizedMinters[msg.sender] || msg.sender == owner(), "Not authorized minter");
        _;
    }

    modifier notFrozen(uint256 tokenId) {
        require(!frozenTokens[tokenId], "Token is frozen");
        _;
    }

    modifier validAssetId(uint256 assetId) {
        require(assetId > 0 && assetId < rwaRegistry.getNextAssetId(), "Invalid asset ID");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory name,
        string memory symbol,
        address registryAddress,
        address initialOwner,
        string memory baseURI
    ) public initializer {
        __ERC721_init(name, symbol);
        __ERC721URIStorage_init();
        __ERC721Burnable_init();
        __Ownable_init(initialOwner);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        rwaRegistry = IRWARegistry(registryAddress);
        _baseTokenURI = baseURI;
        _nextTokenId = 1;
        
        // Owner is automatically authorized minter
        authorizedMinters[initialOwner] = true;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Mint new RWA token
     */
    function mint(
        address to,
        uint256 assetId,
        string memory tokenURI
    ) external onlyAuthorizedMinter whenNotPaused validAssetId(assetId) returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        
        // Check asset status and compliance
        IRWARegistry.RWAAsset memory asset = rwaRegistry.getAsset(assetId);
        require(
            asset.status == IRWARegistry.AssetStatus.VERIFIED || 
            asset.status == IRWARegistry.AssetStatus.ACTIVE,
            "Asset not verified"
        );
        
        // Check user compliance level
        IRWARegistry.ComplianceLevel userCompliance = rwaRegistry.userCompliance(to);
        require(uint8(userCompliance) >= uint8(asset.requiredCompliance), "Insufficient compliance level");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        // Set token info
        TokenInfo storage info = tokenInfo[tokenId];
        info.assetId = assetId;
        info.mintTimestamp = block.timestamp;
        info.originalMinter = msg.sender;
        info.isTransferable = true;
        info.lastTransferTimestamp = block.timestamp;

        emit TokenMinted(tokenId, assetId, to, tokenURI);
        return tokenId;
    }

    /**
     * @dev Cross-chain mint (called by bridge)
     */
    function crossChainMint(
        address to,
        uint256 tokenId,
        uint256 assetId,
        uint256 sourceChainId,
        string memory tokenURI,
        bytes32 txHash
    ) external onlyAuthorizedMinter whenNotPaused {
        require(!processedCrossChainTx[txHash], "Transaction already processed");
        require(!crossChainMinted[tokenId][sourceChainId], "Token already minted from source chain");
        
        processedCrossChainTx[txHash] = true;
        crossChainMinted[tokenId][sourceChainId] = true;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        // Set token info
        TokenInfo storage info = tokenInfo[tokenId];
        info.assetId = assetId;
        info.mintTimestamp = block.timestamp;
        info.originalMinter = to;
        info.isTransferable = true;
        info.lastTransferTimestamp = block.timestamp;

        emit CrossChainMint(tokenId, sourceChainId, block.chainid, txHash);
        emit TokenMinted(tokenId, assetId, to, tokenURI);
    }

    /**
     * @dev Enhanced transfer with compliance checking
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override(ERC721Upgradeable) notFrozen(tokenId) whenNotPaused {
        require(_isAuthorizedTransfer(from, to, tokenId), "Transfer not authorized");
        
        // Update transfer timestamp
        tokenInfo[tokenId].lastTransferTimestamp = block.timestamp;
        
        super.safeTransferFrom(from, to, tokenId, data);
        
        emit ComplianceTransfer(tokenId, from, to, true);
    }

    /**
     * @dev Check if transfer is authorized based on compliance
     */
    function _isAuthorizedTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal view returns (bool) {
        // Check if token is transferable
        if (!tokenInfo[tokenId].isTransferable) {
            return false;
        }
        
        // Get asset compliance requirements
        uint256 assetId = tokenInfo[tokenId].assetId;
        IRWARegistry.RWAAsset memory asset = rwaRegistry.getAsset(assetId);
        
        // Check recipient compliance
        IRWARegistry.ComplianceLevel toCompliance = rwaRegistry.userCompliance(to);
        if (uint8(toCompliance) < uint8(asset.requiredCompliance)) {
            return false;
        }
        
        // Check if recipient is specifically authorized
        if (tokenInfo[tokenId].authorizedTransferees[to]) {
            return true;
        }
        
        return true;
    }

    /**
     * @dev Freeze token (compliance/legal reasons)
     */
    function freezeToken(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        frozenTokens[tokenId] = true;
        emit TokenFrozen(tokenId, msg.sender);
    }

    /**
     * @dev Unfreeze token
     */
    function unfreezeToken(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        frozenTokens[tokenId] = false;
        emit TokenUnfrozen(tokenId, msg.sender);
    }

    /**
     * @dev Set token transferability
     */
    function setTokenTransferable(uint256 tokenId, bool transferable) external {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(
            msg.sender == ownerOf(tokenId) || 
            msg.sender == owner() ||
            rwaRegistry.isAssetOperator(tokenInfo[tokenId].assetId, msg.sender),
            "Not authorized"
        );
        
        tokenInfo[tokenId].isTransferable = transferable;
    }

    /**
     * @dev Authorize specific address for token transfer
     */
    function authorizeTransferee(uint256 tokenId, address transferee, bool authorized) external {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(
            msg.sender == ownerOf(tokenId) || 
            msg.sender == owner(),
            "Not authorized"
        );
        
        tokenInfo[tokenId].authorizedTransferees[transferee] = authorized;
    }

    // Admin functions
    function addAuthorizedMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = true;
    }

    function removeAuthorizedMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
    }

    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function updateRegistry(address newRegistry) external onlyOwner {
        rwaRegistry = IRWARegistry(newRegistry);
    }

    // View functions
    function getTokenInfo(uint256 tokenId) external view returns (
        uint256 assetId,
        uint256 mintTimestamp,
        address originalMinter,
        bool isTransferable,
        uint256 lastTransferTimestamp
    ) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        TokenInfo storage info = tokenInfo[tokenId];
        return (
            info.assetId,
            info.mintTimestamp,
            info.originalMinter,
            info.isTransferable,
            info.lastTransferTimestamp
        );
    }

    function isAuthorizedTransferee(uint256 tokenId, address transferee) external view returns (bool) {
        return tokenInfo[tokenId].authorizedTransferees[transferee];
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // Required overrides
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721Upgradeable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721Upgradeable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
