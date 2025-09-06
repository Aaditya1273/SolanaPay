// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IRWARegistry.sol";
import "../tokens/RWAToken.sol";
import "../tokens/RWAFractional.sol";

/**
 * @title RWAMarketplace
 * @dev Comprehensive marketplace for RWA tokens with advanced features
 * Supports auctions, fixed price sales, fractional trading, and cross-chain operations
 */
contract RWAMarketplace is 
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    IRWARegistry public rwaRegistry;
    
    enum ListingType { FIXED_PRICE, AUCTION, FRACTIONAL_SALE }
    enum ListingStatus { ACTIVE, SOLD, CANCELLED, EXPIRED }

    struct Listing {
        uint256 listingId;
        address seller;
        address tokenContract;
        uint256 tokenId;
        uint256 amount; // For fractional tokens
        ListingType listingType;
        ListingStatus status;
        uint256 price;
        uint256 startTime;
        uint256 endTime;
        address paymentToken; // address(0) for native token
        bool isNFT;
        uint256 minBidIncrement;
        address highestBidder;
        uint256 highestBid;
        mapping(address => uint256) bids;
        uint256 totalBids;
    }

    struct Offer {
        uint256 offerId;
        uint256 listingId;
        address buyer;
        uint256 amount;
        uint256 price;
        uint256 expiry;
        bool isActive;
        address paymentToken;
    }

    // State variables
    uint256 private _nextListingId;
    uint256 private _nextOfferId;
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Offer) public offers;
    mapping(address => bool) public acceptedPaymentTokens;
    mapping(address => uint256) public platformFees; // basis points (10000 = 100%)
    
    // Marketplace settings
    uint256 public defaultPlatformFee; // basis points
    address public feeRecipient;
    uint256 public minAuctionDuration;
    uint256 public maxAuctionDuration;
    
    // Fractional trading
    mapping(address => mapping(uint256 => uint256)) public fractionalListings;
    mapping(address => uint256) public totalFractionalSupply;

    // Events
    event ItemListed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed tokenContract,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        ListingType listingType
    );
    
    event ItemSold(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 price,
        address paymentToken
    );
    
    event BidPlaced(
        uint256 indexed listingId,
        address indexed bidder,
        uint256 bidAmount,
        uint256 timestamp
    );
    
    event AuctionEnded(
        uint256 indexed listingId,
        address indexed winner,
        uint256 winningBid
    );
    
    event OfferMade(
        uint256 indexed offerId,
        uint256 indexed listingId,
        address indexed buyer,
        uint256 amount,
        uint256 price
    );
    
    event OfferAccepted(
        uint256 indexed offerId,
        uint256 indexed listingId,
        address indexed seller,
        address buyer
    );
    
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    
    event FractionalTokensListed(
        address indexed tokenContract,
        address indexed seller,
        uint256 amount,
        uint256 pricePerToken
    );

    // Modifiers
    modifier validListing(uint256 listingId) {
        require(listingId < _nextListingId, "Invalid listing ID");
        require(listings[listingId].status == ListingStatus.ACTIVE, "Listing not active");
        _;
    }

    modifier onlyListingSeller(uint256 listingId) {
        require(listings[listingId].seller == msg.sender, "Not listing seller");
        _;
    }

    modifier acceptedPayment(address paymentToken) {
        require(
            paymentToken == address(0) || acceptedPaymentTokens[paymentToken],
            "Payment token not accepted"
        );
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address registryAddress,
        address initialOwner,
        address _feeRecipient,
        uint256 _defaultPlatformFee
    ) public initializer {
        __Ownable_init(initialOwner);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        rwaRegistry = IRWARegistry(registryAddress);
        feeRecipient = _feeRecipient;
        defaultPlatformFee = _defaultPlatformFee;
        minAuctionDuration = 1 hours;
        maxAuctionDuration = 30 days;
        
        _nextListingId = 1;
        _nextOfferId = 1;
        
        // Accept native token by default
        acceptedPaymentTokens[address(0)] = true;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev List NFT for fixed price sale
     */
    function listNFTFixedPrice(
        address tokenContract,
        uint256 tokenId,
        uint256 price,
        address paymentToken
    ) external whenNotPaused acceptedPayment(paymentToken) returns (uint256) {
        require(price > 0, "Price must be positive");
        
        // Verify ownership and approval
        IERC721 nftContract = IERC721(tokenContract);
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(
            nftContract.isApprovedForAll(msg.sender, address(this)) ||
            nftContract.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );
        
        uint256 listingId = _nextListingId++;
        Listing storage listing = listings[listingId];
        
        listing.listingId = listingId;
        listing.seller = msg.sender;
        listing.tokenContract = tokenContract;
        listing.tokenId = tokenId;
        listing.amount = 1;
        listing.listingType = ListingType.FIXED_PRICE;
        listing.status = ListingStatus.ACTIVE;
        listing.price = price;
        listing.startTime = block.timestamp;
        listing.endTime = 0; // No expiry for fixed price
        listing.paymentToken = paymentToken;
        listing.isNFT = true;
        
        emit ItemListed(listingId, msg.sender, tokenContract, tokenId, 1, price, ListingType.FIXED_PRICE);
        return listingId;
    }

    /**
     * @dev List NFT for auction
     */
    function listNFTAuction(
        address tokenContract,
        uint256 tokenId,
        uint256 startingPrice,
        uint256 duration,
        uint256 minBidIncrement,
        address paymentToken
    ) external whenNotPaused acceptedPayment(paymentToken) returns (uint256) {
        require(startingPrice > 0, "Starting price must be positive");
        require(duration >= minAuctionDuration && duration <= maxAuctionDuration, "Invalid duration");
        require(minBidIncrement > 0, "Min bid increment must be positive");
        
        // Verify ownership and approval
        IERC721 nftContract = IERC721(tokenContract);
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(
            nftContract.isApprovedForAll(msg.sender, address(this)) ||
            nftContract.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );
        
        uint256 listingId = _nextListingId++;
        Listing storage listing = listings[listingId];
        
        listing.listingId = listingId;
        listing.seller = msg.sender;
        listing.tokenContract = tokenContract;
        listing.tokenId = tokenId;
        listing.amount = 1;
        listing.listingType = ListingType.AUCTION;
        listing.status = ListingStatus.ACTIVE;
        listing.price = startingPrice;
        listing.startTime = block.timestamp;
        listing.endTime = block.timestamp + duration;
        listing.paymentToken = paymentToken;
        listing.isNFT = true;
        listing.minBidIncrement = minBidIncrement;
        listing.highestBid = startingPrice;
        
        emit ItemListed(listingId, msg.sender, tokenContract, tokenId, 1, startingPrice, ListingType.AUCTION);
        return listingId;
    }

    /**
     * @dev List fractional tokens for sale
     */
    function listFractionalTokens(
        address tokenContract,
        uint256 amount,
        uint256 pricePerToken,
        address paymentToken
    ) external whenNotPaused acceptedPayment(paymentToken) returns (uint256) {
        require(amount > 0, "Amount must be positive");
        require(pricePerToken > 0, "Price must be positive");
        
        // Verify balance and approval
        IERC20 fractionalContract = IERC20(tokenContract);
        require(fractionalContract.balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(fractionalContract.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");
        
        uint256 listingId = _nextListingId++;
        Listing storage listing = listings[listingId];
        
        listing.listingId = listingId;
        listing.seller = msg.sender;
        listing.tokenContract = tokenContract;
        listing.tokenId = 0;
        listing.amount = amount;
        listing.listingType = ListingType.FRACTIONAL_SALE;
        listing.status = ListingStatus.ACTIVE;
        listing.price = pricePerToken;
        listing.startTime = block.timestamp;
        listing.endTime = 0;
        listing.paymentToken = paymentToken;
        listing.isNFT = false;
        
        // Lock tokens in marketplace
        fractionalContract.transferFrom(msg.sender, address(this), amount);
        fractionalListings[tokenContract][listingId] = amount;
        
        emit ItemListed(listingId, msg.sender, tokenContract, 0, amount, pricePerToken, ListingType.FRACTIONAL_SALE);
        emit FractionalTokensListed(tokenContract, msg.sender, amount, pricePerToken);
        return listingId;
    }

    /**
     * @dev Buy fixed price NFT
     */
    function buyNFT(uint256 listingId) external payable nonReentrant validListing(listingId) {
        Listing storage listing = listings[listingId];
        require(listing.listingType == ListingType.FIXED_PRICE, "Not fixed price listing");
        require(listing.isNFT, "Not NFT listing");
        require(msg.sender != listing.seller, "Cannot buy own listing");
        
        uint256 totalPrice = listing.price;
        uint256 platformFee = (totalPrice * _getPlatformFee(listing.tokenContract)) / 10000;
        uint256 sellerAmount = totalPrice - platformFee;
        
        // Handle payment
        _handlePayment(listing.paymentToken, totalPrice, platformFee, listing.seller, sellerAmount);
        
        // Transfer NFT
        IERC721(listing.tokenContract).transferFrom(listing.seller, msg.sender, listing.tokenId);
        
        // Update listing status
        listing.status = ListingStatus.SOLD;
        
        emit ItemSold(listingId, msg.sender, listing.seller, totalPrice, listing.paymentToken);
    }

    /**
     * @dev Buy fractional tokens
     */
    function buyFractionalTokens(
        uint256 listingId,
        uint256 amount
    ) external payable nonReentrant validListing(listingId) {
        Listing storage listing = listings[listingId];
        require(listing.listingType == ListingType.FRACTIONAL_SALE, "Not fractional sale");
        require(!listing.isNFT, "Not fractional listing");
        require(amount > 0 && amount <= listing.amount, "Invalid amount");
        require(msg.sender != listing.seller, "Cannot buy own listing");
        
        uint256 totalPrice = amount * listing.price;
        uint256 platformFee = (totalPrice * _getPlatformFee(listing.tokenContract)) / 10000;
        uint256 sellerAmount = totalPrice - platformFee;
        
        // Handle payment
        _handlePayment(listing.paymentToken, totalPrice, platformFee, listing.seller, sellerAmount);
        
        // Transfer fractional tokens
        IERC20(listing.tokenContract).transfer(msg.sender, amount);
        
        // Update listing
        listing.amount -= amount;
        fractionalListings[listing.tokenContract][listingId] -= amount;
        
        if (listing.amount == 0) {
            listing.status = ListingStatus.SOLD;
        }
        
        emit ItemSold(listingId, msg.sender, listing.seller, totalPrice, listing.paymentToken);
    }

    /**
     * @dev Place bid on auction
     */
    function placeBid(uint256 listingId) external payable nonReentrant validListing(listingId) {
        Listing storage listing = listings[listingId];
        require(listing.listingType == ListingType.AUCTION, "Not auction listing");
        require(block.timestamp <= listing.endTime, "Auction ended");
        require(msg.sender != listing.seller, "Cannot bid on own auction");
        
        uint256 bidAmount;
        if (listing.paymentToken == address(0)) {
            bidAmount = msg.value;
        } else {
            // For ERC20 tokens, amount should be approved first
            revert("ERC20 auction bidding not implemented in this version");
        }
        
        require(
            bidAmount >= listing.highestBid + listing.minBidIncrement,
            "Bid too low"
        );
        
        // Refund previous highest bidder
        if (listing.highestBidder != address(0) && listing.highestBid > 0) {
            payable(listing.highestBidder).transfer(listing.highestBid);
        }
        
        // Update auction state
        listing.highestBidder = msg.sender;
        listing.highestBid = bidAmount;
        listing.bids[msg.sender] = bidAmount;
        listing.totalBids++;
        
        emit BidPlaced(listingId, msg.sender, bidAmount, block.timestamp);
    }

    /**
     * @dev End auction and transfer NFT to winner
     */
    function endAuction(uint256 listingId) external nonReentrant validListing(listingId) {
        Listing storage listing = listings[listingId];
        require(listing.listingType == ListingType.AUCTION, "Not auction listing");
        require(block.timestamp > listing.endTime, "Auction not ended");
        require(listing.highestBidder != address(0), "No bids placed");
        
        uint256 winningBid = listing.highestBid;
        address winner = listing.highestBidder;
        
        uint256 platformFee = (winningBid * _getPlatformFee(listing.tokenContract)) / 10000;
        uint256 sellerAmount = winningBid - platformFee;
        
        // Transfer payments
        if (platformFee > 0) {
            payable(feeRecipient).transfer(platformFee);
        }
        payable(listing.seller).transfer(sellerAmount);
        
        // Transfer NFT to winner
        IERC721(listing.tokenContract).transferFrom(listing.seller, winner, listing.tokenId);
        
        // Update listing status
        listing.status = ListingStatus.SOLD;
        
        emit AuctionEnded(listingId, winner, winningBid);
        emit ItemSold(listingId, winner, listing.seller, winningBid, listing.paymentToken);
    }

    /**
     * @dev Handle payment processing
     */
    function _handlePayment(
        address paymentToken,
        uint256 totalPrice,
        uint256 platformFee,
        address seller,
        uint256 sellerAmount
    ) internal {
        if (paymentToken == address(0)) {
            // Native token payment
            require(msg.value >= totalPrice, "Insufficient payment");
            
            if (platformFee > 0) {
                payable(feeRecipient).transfer(platformFee);
            }
            payable(seller).transfer(sellerAmount);
            
            // Refund excess
            if (msg.value > totalPrice) {
                payable(msg.sender).transfer(msg.value - totalPrice);
            }
        } else {
            // ERC20 token payment
            IERC20 token = IERC20(paymentToken);
            require(token.balanceOf(msg.sender) >= totalPrice, "Insufficient balance");
            require(token.allowance(msg.sender, address(this)) >= totalPrice, "Insufficient allowance");
            
            if (platformFee > 0) {
                token.transferFrom(msg.sender, feeRecipient, platformFee);
            }
            token.transferFrom(msg.sender, seller, sellerAmount);
        }
    }

    /**
     * @dev Get platform fee for token contract
     */
    function _getPlatformFee(address tokenContract) internal view returns (uint256) {
        uint256 customFee = platformFees[tokenContract];
        return customFee > 0 ? customFee : defaultPlatformFee;
    }

    // Admin functions
    function setAcceptedPaymentToken(address token, bool accepted) external onlyOwner {
        acceptedPaymentTokens[token] = accepted;
    }

    function setPlatformFee(address tokenContract, uint256 fee) external onlyOwner {
        require(fee <= 1000, "Fee too high"); // Max 10%
        platformFees[tokenContract] = fee;
    }

    function setDefaultPlatformFee(uint256 fee) external onlyOwner {
        require(fee <= 1000, "Fee too high"); // Max 10%
        defaultPlatformFee = fee;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        feeRecipient = _feeRecipient;
    }

    function setAuctionDurationLimits(uint256 minDuration, uint256 maxDuration) external onlyOwner {
        minAuctionDuration = minDuration;
        maxAuctionDuration = maxDuration;
    }

    // View functions
    function getListing(uint256 listingId) external view returns (
        address seller,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        ListingType listingType,
        ListingStatus status,
        uint256 price,
        uint256 startTime,
        uint256 endTime,
        address paymentToken,
        bool isNFT
    ) {
        Listing storage listing = listings[listingId];
        return (
            listing.seller,
            listing.tokenContract,
            listing.tokenId,
            listing.amount,
            listing.listingType,
            listing.status,
            listing.price,
            listing.startTime,
            listing.endTime,
            listing.paymentToken,
            listing.isNFT
        );
    }

    function getAuctionInfo(uint256 listingId) external view returns (
        uint256 minBidIncrement,
        address highestBidder,
        uint256 highestBid,
        uint256 totalBids
    ) {
        Listing storage listing = listings[listingId];
        return (
            listing.minBidIncrement,
            listing.highestBidder,
            listing.highestBid,
            listing.totalBids
        );
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
