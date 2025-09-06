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
 * @title CrossChainBridge
 * @dev Handles cross-chain transfers of RWA tokens and fractional tokens
 * Supports OneChain, Ethereum, Polygon, BSC, and other EVM chains
 */
contract CrossChainBridge is 
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    IRWARegistry public rwaRegistry;
    
    struct ChainConfig {
        uint256 chainId;
        address bridgeContract;
        bool isActive;
        uint256 minTransferAmount;
        uint256 maxTransferAmount;
        uint256 bridgeFee;
        uint256 confirmationBlocks;
    }

    struct BridgeTransaction {
        bytes32 txId;
        address sender;
        address recipient;
        address tokenContract;
        uint256 tokenId; // For NFTs, 0 for ERC20
        uint256 amount; // For ERC20, 1 for NFTs
        uint256 sourceChainId;
        uint256 targetChainId;
        uint256 timestamp;
        bool isProcessed;
        bool isNFT;
        string tokenURI; // For NFTs
    }

    // State variables
    mapping(uint256 => ChainConfig) public chainConfigs;
    mapping(bytes32 => BridgeTransaction) public bridgeTransactions;
    mapping(address => bool) public authorizedRelayers;
    mapping(uint256 => mapping(address => bool)) public supportedTokens;
    
    // Cross-chain asset tracking
    mapping(uint256 => mapping(uint256 => address)) public chainTokenContracts;
    mapping(bytes32 => bool) public processedTransactions;
    
    // Fee management
    address public feeRecipient;
    mapping(uint256 => uint256) public chainFees;
    
    uint256 private _nonce;

    // Events
    event BridgeInitiated(
        bytes32 indexed txId,
        address indexed sender,
        address indexed recipient,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        uint256 sourceChainId,
        uint256 targetChainId
    );
    
    event BridgeCompleted(
        bytes32 indexed txId,
        address indexed recipient,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        uint256 targetChainId
    );
    
    event ChainConfigured(
        uint256 indexed chainId,
        address bridgeContract,
        bool isActive
    );
    
    event RelayerAuthorized(address indexed relayer, bool authorized);
    
    event TokenSupported(
        uint256 indexed chainId,
        address indexed tokenContract,
        bool supported
    );

    // Modifiers
    modifier onlyRelayer() {
        require(authorizedRelayers[msg.sender] || msg.sender == owner(), "Not authorized relayer");
        _;
    }

    modifier validChain(uint256 chainId) {
        require(chainConfigs[chainId].isActive, "Chain not supported");
        _;
    }

    modifier supportedToken(uint256 chainId, address tokenContract) {
        require(supportedTokens[chainId][tokenContract], "Token not supported");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address registryAddress,
        address initialOwner,
        address _feeRecipient
    ) public initializer {
        __Ownable_init(initialOwner);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        rwaRegistry = IRWARegistry(registryAddress);
        feeRecipient = _feeRecipient;
        _nonce = 1;
        
        // Configure supported chains
        _configureChain(1, address(0), true, 0.001 ether, 1000 ether, 0.01 ether, 12);
        _configureChain(137, address(0), true, 1 ether, 100000 ether, 1 ether, 20);
        _configureChain(56, address(0), true, 0.01 ether, 10000 ether, 0.001 ether, 3);
        _configureChain(1001, address(0), true, 0.001 ether, 1000 ether, 0.001 ether, 5); // OneChain Testnet
        _configureChain(1000, address(0), true, 0.001 ether, 1000 ether, 0.001 ether, 5); // OneChain Mainnet
        
        // Set initial relayer
        authorizedRelayers[initialOwner] = true;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Initiate cross-chain transfer for NFT
     */
    function bridgeNFT(
        address tokenContract,
        uint256 tokenId,
        address recipient,
        uint256 targetChainId
    ) external payable nonReentrant whenNotPaused validChain(targetChainId) supportedToken(block.chainid, tokenContract) {
        require(recipient != address(0), "Invalid recipient");
        require(msg.value >= chainConfigs[targetChainId].bridgeFee, "Insufficient bridge fee");
        
        // Verify token ownership
        IERC721 nftContract = IERC721(tokenContract);
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not token owner");
        
        // Generate transaction ID
        bytes32 txId = keccak256(abi.encodePacked(
            block.chainid,
            targetChainId,
            tokenContract,
            tokenId,
            msg.sender,
            recipient,
            _nonce++
        ));
        
        // Get token URI
        string memory tokenURI = "";
        try RWAToken(tokenContract).tokenURI(tokenId) returns (string memory uri) {
            tokenURI = uri;
        } catch {}
        
        // Lock NFT in bridge
        nftContract.transferFrom(msg.sender, address(this), tokenId);
        
        // Store bridge transaction
        bridgeTransactions[txId] = BridgeTransaction({
            txId: txId,
            sender: msg.sender,
            recipient: recipient,
            tokenContract: tokenContract,
            tokenId: tokenId,
            amount: 1,
            sourceChainId: block.chainid,
            targetChainId: targetChainId,
            timestamp: block.timestamp,
            isProcessed: false,
            isNFT: true,
            tokenURI: tokenURI
        });
        
        // Transfer fee
        if (msg.value > 0) {
            payable(feeRecipient).transfer(msg.value);
        }
        
        emit BridgeInitiated(
            txId,
            msg.sender,
            recipient,
            tokenContract,
            tokenId,
            1,
            block.chainid,
            targetChainId
        );
    }

    /**
     * @dev Initiate cross-chain transfer for fractional tokens
     */
    function bridgeFractional(
        address tokenContract,
        uint256 amount,
        address recipient,
        uint256 targetChainId
    ) external payable nonReentrant whenNotPaused validChain(targetChainId) supportedToken(block.chainid, tokenContract) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        require(msg.value >= chainConfigs[targetChainId].bridgeFee, "Insufficient bridge fee");
        
        ChainConfig memory config = chainConfigs[targetChainId];
        require(amount >= config.minTransferAmount, "Below minimum transfer amount");
        require(amount <= config.maxTransferAmount, "Above maximum transfer amount");
        
        // Verify token balance
        IERC20 fractionalContract = IERC20(tokenContract);
        require(fractionalContract.balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Generate transaction ID
        bytes32 txId = keccak256(abi.encodePacked(
            block.chainid,
            targetChainId,
            tokenContract,
            amount,
            msg.sender,
            recipient,
            _nonce++
        ));
        
        // Burn tokens on source chain
        RWAFractional(tokenContract).burnFrom(msg.sender, amount);
        
        // Store bridge transaction
        bridgeTransactions[txId] = BridgeTransaction({
            txId: txId,
            sender: msg.sender,
            recipient: recipient,
            tokenContract: tokenContract,
            tokenId: 0,
            amount: amount,
            sourceChainId: block.chainid,
            targetChainId: targetChainId,
            timestamp: block.timestamp,
            isProcessed: false,
            isNFT: false,
            tokenURI: ""
        });
        
        // Transfer fee
        if (msg.value > 0) {
            payable(feeRecipient).transfer(msg.value);
        }
        
        emit BridgeInitiated(
            txId,
            msg.sender,
            recipient,
            tokenContract,
            0,
            amount,
            block.chainid,
            targetChainId
        );
    }

    /**
     * @dev Complete cross-chain transfer (called by relayers)
     */
    function completeBridge(
        bytes32 txId,
        address targetTokenContract
    ) external onlyRelayer nonReentrant {
        require(!processedTransactions[txId], "Transaction already processed");
        
        BridgeTransaction storage bridgeTx = bridgeTransactions[txId];
        require(bridgeTx.txId == txId, "Invalid transaction");
        require(!bridgeTx.isProcessed, "Transaction already processed");
        require(bridgeTx.targetChainId == block.chainid, "Wrong target chain");
        
        processedTransactions[txId] = true;
        bridgeTx.isProcessed = true;
        
        if (bridgeTx.isNFT) {
            // Mint NFT on target chain
            RWAToken targetContract = RWAToken(targetTokenContract);
            
            // Get asset info from original token
            (uint256 assetId,,,,,) = targetContract.getTokenInfo(bridgeTx.tokenId);
            
            targetContract.crossChainMint(
                bridgeTx.recipient,
                bridgeTx.tokenId,
                assetId,
                bridgeTx.sourceChainId,
                bridgeTx.tokenURI,
                txId
            );
        } else {
            // Mint fractional tokens on target chain
            RWAFractional targetContract = RWAFractional(targetTokenContract);
            
            targetContract.crossChainTransfer(
                bridgeTx.sender,
                bridgeTx.recipient,
                bridgeTx.amount,
                bridgeTx.sourceChainId,
                bridgeTx.targetChainId,
                txId
            );
        }
        
        emit BridgeCompleted(
            txId,
            bridgeTx.recipient,
            targetTokenContract,
            bridgeTx.tokenId,
            bridgeTx.amount,
            bridgeTx.targetChainId
        );
    }

    /**
     * @dev Emergency unlock (for failed bridges)
     */
    function emergencyUnlock(
        bytes32 txId,
        address tokenContract
    ) external onlyOwner {
        BridgeTransaction storage bridgeTx = bridgeTransactions[txId];
        require(bridgeTx.txId == txId, "Invalid transaction");
        require(!bridgeTx.isProcessed, "Transaction already processed");
        require(block.timestamp > bridgeTx.timestamp + 7 days, "Too early for emergency unlock");
        
        if (bridgeTx.isNFT) {
            // Return NFT to original sender
            IERC721(tokenContract).transferFrom(address(this), bridgeTx.sender, bridgeTx.tokenId);
        }
        
        bridgeTx.isProcessed = true;
    }

    // Admin functions
    function configureChain(
        uint256 chainId,
        address bridgeContract,
        bool isActive,
        uint256 minTransferAmount,
        uint256 maxTransferAmount,
        uint256 bridgeFee,
        uint256 confirmationBlocks
    ) external onlyOwner {
        _configureChain(chainId, bridgeContract, isActive, minTransferAmount, maxTransferAmount, bridgeFee, confirmationBlocks);
    }

    function _configureChain(
        uint256 chainId,
        address bridgeContract,
        bool isActive,
        uint256 minTransferAmount,
        uint256 maxTransferAmount,
        uint256 bridgeFee,
        uint256 confirmationBlocks
    ) internal {
        chainConfigs[chainId] = ChainConfig({
            chainId: chainId,
            bridgeContract: bridgeContract,
            isActive: isActive,
            minTransferAmount: minTransferAmount,
            maxTransferAmount: maxTransferAmount,
            bridgeFee: bridgeFee,
            confirmationBlocks: confirmationBlocks
        });
        
        emit ChainConfigured(chainId, bridgeContract, isActive);
    }

    function authorizeRelayer(address relayer, bool authorized) external onlyOwner {
        authorizedRelayers[relayer] = authorized;
        emit RelayerAuthorized(relayer, authorized);
    }

    function setSupportedToken(uint256 chainId, address tokenContract, bool supported) external onlyOwner {
        supportedTokens[chainId][tokenContract] = supported;
        emit TokenSupported(chainId, tokenContract, supported);
    }

    function setChainTokenContract(uint256 chainId, uint256 assetId, address tokenContract) external onlyOwner {
        chainTokenContracts[chainId][assetId] = tokenContract;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        feeRecipient = _feeRecipient;
    }

    function updateRegistry(address newRegistry) external onlyOwner {
        rwaRegistry = IRWARegistry(newRegistry);
    }

    // View functions
    function getBridgeTransaction(bytes32 txId) external view returns (BridgeTransaction memory) {
        return bridgeTransactions[txId];
    }

    function getChainConfig(uint256 chainId) external view returns (ChainConfig memory) {
        return chainConfigs[chainId];
    }

    function isTransactionProcessed(bytes32 txId) external view returns (bool) {
        return processedTransactions[txId];
    }

    function getChainTokenContract(uint256 chainId, uint256 assetId) external view returns (address) {
        return chainTokenContracts[chainId][assetId];
    }

    // Emergency functions
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).transfer(owner(), amount);
        }
    }
}
