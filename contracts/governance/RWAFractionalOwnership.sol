// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title RWAFractionalOwnership
 * @dev ERC-1155 contract for fractional ownership of Real World Assets with governance integration
 * Each token ID represents a different RWA asset, with supply representing fractional shares
 */
contract RWAFractionalOwnership is 
    Initializable,
    ERC1155Upgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using Strings for uint256;

    struct AssetInfo {
        string name;
        string description;
        string assetType; // "Real Estate", "Carbon Credits", etc.
        string location;
        uint256 totalSupply;
        uint256 totalValue; // In wei
        uint256 pricePerShare; // In wei
        address governanceContract;
        bool isActive;
        uint256 createdAt;
        uint256 lastValuationUpdate;
        string metadataURI;
        mapping(address => uint256) lastDividendClaim;
    }

    struct DividendInfo {
        uint256 totalAmount;
        uint256 perShareAmount;
        uint256 timestamp;
        bool isActive;
        mapping(address => bool) hasClaimed;
    }

    // State variables
    mapping(uint256 => AssetInfo) public assets;
    mapping(uint256 => DividendInfo) public dividends;
    mapping(uint256 => uint256[]) public assetDividendIds;
    mapping(address => bool) public authorizedMinters;
    mapping(uint256 => mapping(address => uint256)) public shareHoldings;
    
    uint256 public nextAssetId;
    uint256 public nextDividendId;
    uint256 public minimumSharePrice;
    uint256 public platformFeePercentage; // In basis points (100 = 1%)
    address public feeRecipient;
    
    // Events
    event AssetCreated(
        uint256 indexed assetId,
        string name,
        string assetType,
        uint256 totalSupply,
        uint256 totalValue
    );
    
    event SharesMinted(
        uint256 indexed assetId,
        address indexed to,
        uint256 amount,
        uint256 price
    );
    
    event SharesBurned(
        uint256 indexed assetId,
        address indexed from,
        uint256 amount
    );
    
    event AssetValuationUpdated(
        uint256 indexed assetId,
        uint256 oldValue,
        uint256 newValue,
        uint256 newPricePerShare
    );
    
    event DividendDistributed(
        uint256 indexed assetId,
        uint256 indexed dividendId,
        uint256 totalAmount,
        uint256 perShareAmount
    );
    
    event DividendClaimed(
        uint256 indexed assetId,
        uint256 indexed dividendId,
        address indexed shareholder,
        uint256 amount
    );
    
    event GovernanceContractSet(
        uint256 indexed assetId,
        address indexed governanceContract
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        string memory baseURI,
        address _feeRecipient
    ) public initializer {
        __ERC1155_init(baseURI);
        __Ownable_init(initialOwner);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        nextAssetId = 1;
        nextDividendId = 1;
        minimumSharePrice = 0.001 ether;
        platformFeePercentage = 250; // 2.5%
        feeRecipient = _feeRecipient;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Create a new RWA asset for fractional ownership
     */
    function createAsset(
        string memory name,
        string memory description,
        string memory assetType,
        string memory location,
        uint256 totalSupply,
        uint256 totalValue,
        string memory metadataURI
    ) external onlyOwner returns (uint256 assetId) {
        require(totalSupply > 0, "Total supply must be positive");
        require(totalValue > 0, "Total value must be positive");
        require(bytes(name).length > 0, "Name cannot be empty");
        
        assetId = nextAssetId++;
        uint256 pricePerShare = totalValue / totalSupply;
        require(pricePerShare >= minimumSharePrice, "Price per share too low");
        
        AssetInfo storage asset = assets[assetId];
        asset.name = name;
        asset.description = description;
        asset.assetType = assetType;
        asset.location = location;
        asset.totalSupply = totalSupply;
        asset.totalValue = totalValue;
        asset.pricePerShare = pricePerShare;
        asset.isActive = true;
        asset.createdAt = block.timestamp;
        asset.lastValuationUpdate = block.timestamp;
        asset.metadataURI = metadataURI;
        
        emit AssetCreated(assetId, name, assetType, totalSupply, totalValue);
        return assetId;
    }

    /**
     * @dev Mint fractional shares to an address
     */
    function mintShares(
        uint256 assetId,
        address to,
        uint256 amount
    ) external payable nonReentrant whenNotPaused {
        require(assets[assetId].isActive, "Asset not active");
        require(amount > 0, "Amount must be positive");
        require(to != address(0), "Cannot mint to zero address");
        
        AssetInfo storage asset = assets[assetId];
        require(
            totalSupply(assetId) + amount <= asset.totalSupply,
            "Exceeds total supply"
        );
        
        uint256 totalCost = amount * asset.pricePerShare;
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Calculate platform fee
        uint256 platformFee = (totalCost * platformFeePercentage) / 10000;
        uint256 netAmount = totalCost - platformFee;
        
        // Mint shares
        _mint(to, assetId, amount, "");
        shareHoldings[assetId][to] += amount;
        
        // Transfer fees
        if (platformFee > 0) {
            payable(feeRecipient).transfer(platformFee);
        }
        
        // Refund excess payment
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit SharesMinted(assetId, to, amount, asset.pricePerShare);
    }

    /**
     * @dev Burn fractional shares (for liquidation or redemption)
     */
    function burnShares(
        uint256 assetId,
        address from,
        uint256 amount
    ) external {
        require(
            msg.sender == from || 
            isApprovedForAll(from, msg.sender) || 
            assets[assetId].governanceContract == msg.sender,
            "Not authorized to burn"
        );
        require(balanceOf(from, assetId) >= amount, "Insufficient balance");
        
        _burn(from, assetId, amount);
        shareHoldings[assetId][from] -= amount;
        
        emit SharesBurned(assetId, from, amount);
    }

    /**
     * @dev Update asset valuation (only by governance or owner)
     */
    function updateAssetValuation(
        uint256 assetId,
        uint256 newTotalValue
    ) external {
        require(assets[assetId].isActive, "Asset not active");
        require(
            msg.sender == owner() || 
            msg.sender == assets[assetId].governanceContract,
            "Not authorized"
        );
        require(newTotalValue > 0, "Value must be positive");
        
        AssetInfo storage asset = assets[assetId];
        uint256 oldValue = asset.totalValue;
        uint256 newPricePerShare = newTotalValue / asset.totalSupply;
        
        asset.totalValue = newTotalValue;
        asset.pricePerShare = newPricePerShare;
        asset.lastValuationUpdate = block.timestamp;
        
        emit AssetValuationUpdated(assetId, oldValue, newTotalValue, newPricePerShare);
    }

    /**
     * @dev Distribute dividends to shareholders
     */
    function distributeDividends(uint256 assetId) external payable nonReentrant {
        require(assets[assetId].isActive, "Asset not active");
        require(msg.value > 0, "No dividends to distribute");
        require(
            msg.sender == owner() || 
            msg.sender == assets[assetId].governanceContract,
            "Not authorized"
        );
        
        uint256 currentSupply = totalSupply(assetId);
        require(currentSupply > 0, "No shares outstanding");
        
        uint256 dividendId = nextDividendId++;
        uint256 perShareAmount = msg.value / currentSupply;
        
        DividendInfo storage dividend = dividends[dividendId];
        dividend.totalAmount = msg.value;
        dividend.perShareAmount = perShareAmount;
        dividend.timestamp = block.timestamp;
        dividend.isActive = true;
        
        assetDividendIds[assetId].push(dividendId);
        
        emit DividendDistributed(assetId, dividendId, msg.value, perShareAmount);
    }

    /**
     * @dev Claim dividends for a specific dividend distribution
     */
    function claimDividends(
        uint256 assetId,
        uint256 dividendId
    ) external nonReentrant {
        require(dividends[dividendId].isActive, "Dividend not active");
        require(!dividends[dividendId].hasClaimed[msg.sender], "Already claimed");
        
        uint256 shareholderBalance = balanceOf(msg.sender, assetId);
        require(shareholderBalance > 0, "No shares owned");
        
        uint256 dividendAmount = shareholderBalance * dividends[dividendId].perShareAmount;
        require(dividendAmount > 0, "No dividends to claim");
        
        dividends[dividendId].hasClaimed[msg.sender] = true;
        assets[assetId].lastDividendClaim[msg.sender] = block.timestamp;
        
        payable(msg.sender).transfer(dividendAmount);
        
        emit DividendClaimed(assetId, dividendId, msg.sender, dividendAmount);
    }

    /**
     * @dev Batch claim all available dividends for an asset
     */
    function claimAllDividends(uint256 assetId) external nonReentrant {
        uint256[] memory dividendIds = assetDividendIds[assetId];
        uint256 totalDividends = 0;
        uint256 shareholderBalance = balanceOf(msg.sender, assetId);
        
        require(shareholderBalance > 0, "No shares owned");
        
        for (uint256 i = 0; i < dividendIds.length; i++) {
            uint256 dividendId = dividendIds[i];
            DividendInfo storage dividend = dividends[dividendId];
            
            if (dividend.isActive && !dividend.hasClaimed[msg.sender]) {
                uint256 dividendAmount = shareholderBalance * dividend.perShareAmount;
                if (dividendAmount > 0) {
                    dividend.hasClaimed[msg.sender] = true;
                    totalDividends += dividendAmount;
                    emit DividendClaimed(assetId, dividendId, msg.sender, dividendAmount);
                }
            }
        }
        
        require(totalDividends > 0, "No dividends to claim");
        assets[assetId].lastDividendClaim[msg.sender] = block.timestamp;
        payable(msg.sender).transfer(totalDividends);
    }

    /**
     * @dev Set governance contract for an asset
     */
    function setGovernanceContract(
        uint256 assetId,
        address governanceContract
    ) external onlyOwner {
        require(assets[assetId].isActive, "Asset not active");
        assets[assetId].governanceContract = governanceContract;
        emit GovernanceContractSet(assetId, governanceContract);
    }

    /**
     * @dev Generate dynamic metadata for ERC-1155 tokens
     */
    function uri(uint256 assetId) public view override returns (string memory) {
        require(assets[assetId].isActive, "Asset not active");
        
        AssetInfo storage asset = assets[assetId];
        uint256 currentSupply = totalSupply(assetId);
        
        // Create JSON metadata
        string memory json = string(
            abi.encodePacked(
                '{"name":"',
                asset.name,
                ' Fractional Shares","description":"',
                asset.description,
                '","image":"https://api.omniflow.com/assets/',
                assetId.toString(),
                '/image","attributes":[',
                '{"trait_type":"Asset Type","value":"',
                asset.assetType,
                '"},',
                '{"trait_type":"Location","value":"',
                asset.location,
                '"},',
                '{"trait_type":"Total Supply","value":"',
                asset.totalSupply.toString(),
                '"},',
                '{"trait_type":"Circulating Supply","value":"',
                currentSupply.toString(),
                '"},',
                '{"trait_type":"Total Value","value":"',
                asset.totalValue.toString(),
                '"},',
                '{"trait_type":"Price Per Share","value":"',
                asset.pricePerShare.toString(),
                '"},',
                '{"trait_type":"Created At","value":"',
                asset.createdAt.toString(),
                '"},',
                '{"trait_type":"Last Valuation Update","value":"',
                asset.lastValuationUpdate.toString(),
                '"}]}'
            )
        );
        
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(bytes(json))
            )
        );
    }

    // View functions
    function getAssetInfo(uint256 assetId) external view returns (
        string memory name,
        string memory description,
        string memory assetType,
        string memory location,
        uint256 totalSupply,
        uint256 totalValue,
        uint256 pricePerShare,
        address governanceContract,
        bool isActive,
        uint256 createdAt,
        uint256 lastValuationUpdate
    ) {
        AssetInfo storage asset = assets[assetId];
        return (
            asset.name,
            asset.description,
            asset.assetType,
            asset.location,
            asset.totalSupply,
            asset.totalValue,
            asset.pricePerShare,
            asset.governanceContract,
            asset.isActive,
            asset.createdAt,
            asset.lastValuationUpdate
        );
    }

    function getShareholderInfo(
        uint256 assetId,
        address shareholder
    ) external view returns (
        uint256 balance,
        uint256 ownershipPercentage,
        uint256 lastDividendClaim,
        uint256 unclaimedDividends
    ) {
        balance = balanceOf(shareholder, assetId);
        uint256 currentSupply = totalSupply(assetId);
        
        if (currentSupply > 0) {
            ownershipPercentage = (balance * 10000) / currentSupply; // In basis points
        }
        
        lastDividendClaim = assets[assetId].lastDividendClaim[shareholder];
        unclaimedDividends = calculateUnclaimedDividends(assetId, shareholder);
        
        return (balance, ownershipPercentage, lastDividendClaim, unclaimedDividends);
    }

    function calculateUnclaimedDividends(
        uint256 assetId,
        address shareholder
    ) public view returns (uint256 totalUnclaimed) {
        uint256[] memory dividendIds = assetDividendIds[assetId];
        uint256 shareholderBalance = balanceOf(shareholder, assetId);
        
        for (uint256 i = 0; i < dividendIds.length; i++) {
            uint256 dividendId = dividendIds[i];
            DividendInfo storage dividend = dividends[dividendId];
            
            if (dividend.isActive && !dividend.hasClaimed[shareholder]) {
                totalUnclaimed += shareholderBalance * dividend.perShareAmount;
            }
        }
        
        return totalUnclaimed;
    }

    function getAssetDividends(uint256 assetId) external view returns (uint256[] memory) {
        return assetDividendIds[assetId];
    }

    function totalSupply(uint256 assetId) public view returns (uint256) {
        // This would need to be implemented by tracking minted/burned amounts
        // For now, returning a placeholder - in production, implement proper tracking
        return assets[assetId].totalSupply;
    }

    // Admin functions
    function setMinimumSharePrice(uint256 _minimumSharePrice) external onlyOwner {
        minimumSharePrice = _minimumSharePrice;
    }

    function setPlatformFee(uint256 _platformFeePercentage) external onlyOwner {
        require(_platformFeePercentage <= 1000, "Fee too high"); // Max 10%
        platformFeePercentage = _platformFeePercentage;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    function setAuthorizedMinter(address minter, bool authorized) external onlyOwner {
        authorizedMinters[minter] = authorized;
    }

    function deactivateAsset(uint256 assetId) external onlyOwner {
        assets[assetId].isActive = false;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
