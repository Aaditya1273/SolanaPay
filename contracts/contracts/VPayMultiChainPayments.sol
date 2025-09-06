// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title VPayMultiChainPayments
 * @dev Multi-chain payment processing contract for VPay platform
 * Supports native tokens and stablecoins across Ethereum, Polygon, and BSC
 */
contract VPayMultiChainPayments is ReentrancyGuard, Ownable, Pausable {
    
    // Supported stablecoins on each chain
    mapping(address => bool) public supportedTokens;
    mapping(address => uint8) public tokenDecimals;
    
    // Payment tracking
    struct Payment {
        address payer;
        address merchant;
        address token; // address(0) for native token
        uint256 amount;
        uint256 feeAmount;
        string orderId;
        uint256 timestamp;
        PaymentStatus status;
        uint256 chainId;
    }
    
    enum PaymentStatus {
        Pending,
        Completed,
        Refunded,
        Disputed
    }
    
    // Storage
    mapping(bytes32 => Payment) public payments;
    mapping(address => uint256) public merchantBalances;
    mapping(address => mapping(address => uint256)) public tokenBalances; // merchant => token => balance
    
    // Fee structure
    uint256 public platformFeePercent = 250; // 2.5% in basis points
    uint256 public constant MAX_FEE_PERCENT = 1000; // 10% max fee
    address public feeRecipient;
    
    // Events
    event PaymentCreated(
        bytes32 indexed paymentId,
        address indexed payer,
        address indexed merchant,
        address token,
        uint256 amount,
        string orderId
    );
    
    event PaymentCompleted(
        bytes32 indexed paymentId,
        address indexed merchant,
        uint256 amount,
        uint256 fee
    );
    
    event PaymentRefunded(
        bytes32 indexed paymentId,
        address indexed payer,
        uint256 amount
    );
    
    event TokenAdded(address indexed token, uint8 decimals);
    event TokenRemoved(address indexed token);
    event FeeUpdated(uint256 newFeePercent);
    
    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient;
        
        // Add common stablecoins based on chain
        uint256 chainId = block.chainid;
        
        if (chainId == 1) { // Ethereum Mainnet
            _addToken(0xA0b86a33E6441b8435b662303c0f218C8c7e8e56, 6); // USDC
            _addToken(0xdAC17F958D2ee523a2206206994597C13D831ec7, 6); // USDT
            _addToken(0x6B175474E89094C44Da98b954EedeAC495271d0F, 18); // DAI
        } else if (chainId == 137) { // Polygon
            _addToken(0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174, 6); // USDC
            _addToken(0xc2132D05D31c914a87C6611C10748AEb04B58e8F, 6); // USDT
            _addToken(0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063, 18); // DAI
        } else if (chainId == 56) { // BSC
            _addToken(0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d, 18); // USDC
            _addToken(0x55d398326f99059fF775485246999027B3197955, 18); // USDT
            _addToken(0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56, 18); // BUSD
        }
    }
    
    /**
     * @dev Create a payment with native token (ETH, MATIC, BNB)
     */
    function createNativePayment(
        address merchant,
        string calldata orderId
    ) external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "Payment amount must be greater than 0");
        require(merchant != address(0), "Invalid merchant address");
        require(bytes(orderId).length > 0, "Order ID required");
        
        bytes32 paymentId = keccak256(abi.encodePacked(
            msg.sender,
            merchant,
            address(0),
            msg.value,
            orderId,
            block.timestamp,
            block.chainid
        ));
        
        require(payments[paymentId].payer == address(0), "Payment already exists");
        
        uint256 feeAmount = (msg.value * platformFeePercent) / 10000;
        uint256 merchantAmount = msg.value - feeAmount;
        
        payments[paymentId] = Payment({
            payer: msg.sender,
            merchant: merchant,
            token: address(0),
            amount: msg.value,
            feeAmount: feeAmount,
            orderId: orderId,
            timestamp: block.timestamp,
            status: PaymentStatus.Pending,
            chainId: block.chainid
        });
        
        // Transfer fee to platform
        if (feeAmount > 0) {
            payable(feeRecipient).transfer(feeAmount);
        }
        
        // Hold merchant amount in contract for now
        merchantBalances[merchant] += merchantAmount;
        
        emit PaymentCreated(paymentId, msg.sender, merchant, address(0), msg.value, orderId);
    }
    
    /**
     * @dev Create a payment with ERC20 token
     */
    function createTokenPayment(
        address merchant,
        address token,
        uint256 amount,
        string calldata orderId
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "Payment amount must be greater than 0");
        require(merchant != address(0), "Invalid merchant address");
        require(supportedTokens[token], "Token not supported");
        require(bytes(orderId).length > 0, "Order ID required");
        
        bytes32 paymentId = keccak256(abi.encodePacked(
            msg.sender,
            merchant,
            token,
            amount,
            orderId,
            block.timestamp,
            block.chainid
        ));
        
        require(payments[paymentId].payer == address(0), "Payment already exists");
        
        // Transfer tokens from payer
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        uint256 feeAmount = (amount * platformFeePercent) / 10000;
        uint256 merchantAmount = amount - feeAmount;
        
        payments[paymentId] = Payment({
            payer: msg.sender,
            merchant: merchant,
            token: token,
            amount: amount,
            feeAmount: feeAmount,
            orderId: orderId,
            timestamp: block.timestamp,
            status: PaymentStatus.Pending,
            chainId: block.chainid
        });
        
        // Transfer fee to platform
        if (feeAmount > 0) {
            IERC20(token).transfer(feeRecipient, feeAmount);
        }
        
        // Hold merchant amount in contract
        tokenBalances[merchant][token] += merchantAmount;
        
        emit PaymentCreated(paymentId, msg.sender, merchant, token, amount, orderId);
    }
    
    /**
     * @dev Complete a payment and release funds to merchant
     */
    function completePayment(bytes32 paymentId) external nonReentrant {
        Payment storage payment = payments[paymentId];
        require(payment.payer != address(0), "Payment not found");
        require(payment.status == PaymentStatus.Pending, "Payment not pending");
        require(
            msg.sender == payment.merchant || msg.sender == owner(),
            "Only merchant or owner can complete payment"
        );
        
        payment.status = PaymentStatus.Completed;
        
        uint256 merchantAmount = payment.amount - payment.feeAmount;
        
        if (payment.token == address(0)) {
            // Native token payment
            merchantBalances[payment.merchant] -= merchantAmount;
            payable(payment.merchant).transfer(merchantAmount);
        } else {
            // ERC20 token payment
            tokenBalances[payment.merchant][payment.token] -= merchantAmount;
            IERC20(payment.token).transfer(payment.merchant, merchantAmount);
        }
        
        emit PaymentCompleted(paymentId, payment.merchant, merchantAmount, payment.feeAmount);
    }
    
    /**
     * @dev Refund a payment
     */
    function refundPayment(bytes32 paymentId) external nonReentrant {
        Payment storage payment = payments[paymentId];
        require(payment.payer != address(0), "Payment not found");
        require(payment.status == PaymentStatus.Pending, "Payment not pending");
        require(
            msg.sender == payment.merchant || msg.sender == owner(),
            "Only merchant or owner can refund payment"
        );
        
        payment.status = PaymentStatus.Refunded;
        
        uint256 refundAmount = payment.amount - payment.feeAmount; // Platform keeps fee
        
        if (payment.token == address(0)) {
            // Native token refund
            merchantBalances[payment.merchant] -= refundAmount;
            payable(payment.payer).transfer(refundAmount);
        } else {
            // ERC20 token refund
            tokenBalances[payment.merchant][payment.token] -= refundAmount;
            IERC20(payment.token).transfer(payment.payer, refundAmount);
        }
        
        emit PaymentRefunded(paymentId, payment.payer, refundAmount);
    }
    
    /**
     * @dev Withdraw merchant balance
     */
    function withdrawBalance(address token) external nonReentrant {
        if (token == address(0)) {
            uint256 balance = merchantBalances[msg.sender];
            require(balance > 0, "No balance to withdraw");
            merchantBalances[msg.sender] = 0;
            payable(msg.sender).transfer(balance);
        } else {
            uint256 balance = tokenBalances[msg.sender][token];
            require(balance > 0, "No balance to withdraw");
            tokenBalances[msg.sender][token] = 0;
            IERC20(token).transfer(msg.sender, balance);
        }
    }
    
    /**
     * @dev Get payment details
     */
    function getPayment(bytes32 paymentId) external view returns (Payment memory) {
        return payments[paymentId];
    }
    
    /**
     * @dev Get merchant balance for specific token
     */
    function getMerchantBalance(address merchant, address token) external view returns (uint256) {
        if (token == address(0)) {
            return merchantBalances[merchant];
        }
        return tokenBalances[merchant][token];
    }
    
    // Admin functions
    function addToken(address token, uint8 decimals) external onlyOwner {
        _addToken(token, decimals);
    }
    
    function removeToken(address token) external onlyOwner {
        supportedTokens[token] = false;
        delete tokenDecimals[token];
        emit TokenRemoved(token);
    }
    
    function updateFee(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= MAX_FEE_PERCENT, "Fee too high");
        platformFeePercent = newFeePercent;
        emit FeeUpdated(newFeePercent);
    }
    
    function updateFeeRecipient(address newFeeRecipient) external onlyOwner {
        require(newFeeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = newFeeRecipient;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Internal functions
    function _addToken(address token, uint8 decimals) internal {
        require(token != address(0), "Invalid token address");
        supportedTokens[token] = true;
        tokenDecimals[token] = decimals;
        emit TokenAdded(token, decimals);
    }
    
    // Emergency functions
    function emergencyWithdraw(address token) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(address(this).balance);
        } else {
            IERC20(token).transfer(owner(), IERC20(token).balanceOf(address(this)));
        }
    }
}
