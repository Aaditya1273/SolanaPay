// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IEntryPoint {
    function handleOps(UserOperation[] calldata ops, address payable beneficiary) external;
    function getUserOpHash(UserOperation calldata userOp) external view returns (bytes32);
    function depositTo(address account) external payable;
    function balanceOf(address account) external view returns (uint256);
}

struct UserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    uint256 callGasLimit;
    uint256 verificationGasLimit;
    uint256 preVerificationGas;
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    bytes paymasterAndData;
    bytes signature;
}

/**
 * @title VPayPaymaster
 * @dev ERC-4337 Paymaster contract for sponsoring gas fees in VPay payments
 * Allows merchants to sponsor gas fees for their customers' transactions
 */
contract VPayPaymaster is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IEntryPoint public immutable entryPoint;
    
    // Merchant configurations
    struct MerchantConfig {
        bool isActive;
        bool sponsorGas;
        uint256 gasLimit;           // Max gas to sponsor per transaction
        uint256 dailyLimit;         // Max gas to sponsor per day
        uint256 dailySpent;         // Gas spent today
        uint256 lastResetDay;       // Last day the daily limit was reset
        address[] allowedTokens;    // Tokens that can be used for payments
        mapping(address => bool) isTokenAllowed;
    }

    // Payment session for tracking sponsored transactions
    struct PaymentSession {
        address merchant;
        address customer;
        uint256 amount;
        address token;
        uint256 gasSponsored;
        uint256 timestamp;
        bool completed;
    }

    mapping(address => MerchantConfig) public merchantConfigs;
    mapping(bytes32 => PaymentSession) public paymentSessions;
    mapping(address => uint256) public merchantDeposits;
    
    // Global settings
    uint256 public maxGasPerTransaction = 500000;
    uint256 public maxDailyGasPerMerchant = 10000000;
    uint256 public minimumMerchantDeposit = 0.1 ether;
    
    // Events
    event MerchantRegistered(address indexed merchant, bool sponsorGas);
    event MerchantConfigUpdated(address indexed merchant, bool sponsorGas, uint256 gasLimit, uint256 dailyLimit);
    event GasSponsored(address indexed merchant, address indexed customer, uint256 gasAmount, bytes32 sessionId);
    event MerchantDepositAdded(address indexed merchant, uint256 amount);
    event MerchantDepositWithdrawn(address indexed merchant, uint256 amount);
    event PaymentSessionCreated(bytes32 indexed sessionId, address indexed merchant, address indexed customer);
    event PaymentSessionCompleted(bytes32 indexed sessionId, bool success);

    modifier onlyEntryPoint() {
        require(msg.sender == address(entryPoint), "Only EntryPoint can call this");
        _;
    }

    modifier onlyRegisteredMerchant() {
        require(merchantConfigs[msg.sender].isActive, "Merchant not registered");
        _;
    }

    constructor(IEntryPoint _entryPoint) {
        entryPoint = _entryPoint;
    }

    /**
     * @dev Register a merchant for gas sponsorship
     */
    function registerMerchant(
        bool _sponsorGas,
        uint256 _gasLimit,
        uint256 _dailyLimit,
        address[] calldata _allowedTokens
    ) external payable {
        require(msg.value >= minimumMerchantDeposit, "Insufficient deposit");
        require(_gasLimit <= maxGasPerTransaction, "Gas limit too high");
        require(_dailyLimit <= maxDailyGasPerMerchant, "Daily limit too high");

        MerchantConfig storage config = merchantConfigs[msg.sender];
        config.isActive = true;
        config.sponsorGas = _sponsorGas;
        config.gasLimit = _gasLimit;
        config.dailyLimit = _dailyLimit;
        config.dailySpent = 0;
        config.lastResetDay = getCurrentDay();
        
        // Set allowed tokens
        for (uint i = 0; i < _allowedTokens.length; i++) {
            config.allowedTokens.push(_allowedTokens[i]);
            config.isTokenAllowed[_allowedTokens[i]] = true;
        }

        merchantDeposits[msg.sender] += msg.value;

        // Deposit to EntryPoint for gas sponsorship
        entryPoint.depositTo{value: msg.value}(address(this));

        emit MerchantRegistered(msg.sender, _sponsorGas);
        emit MerchantDepositAdded(msg.sender, msg.value);
    }

    /**
     * @dev Update merchant configuration
     */
    function updateMerchantConfig(
        bool _sponsorGas,
        uint256 _gasLimit,
        uint256 _dailyLimit
    ) external onlyRegisteredMerchant {
        require(_gasLimit <= maxGasPerTransaction, "Gas limit too high");
        require(_dailyLimit <= maxDailyGasPerMerchant, "Daily limit too high");

        MerchantConfig storage config = merchantConfigs[msg.sender];
        config.sponsorGas = _sponsorGas;
        config.gasLimit = _gasLimit;
        config.dailyLimit = _dailyLimit;

        emit MerchantConfigUpdated(msg.sender, _sponsorGas, _gasLimit, _dailyLimit);
    }

    /**
     * @dev Add merchant deposit for gas sponsorship
     */
    function addMerchantDeposit() external payable onlyRegisteredMerchant {
        require(msg.value > 0, "Deposit must be greater than 0");
        
        merchantDeposits[msg.sender] += msg.value;
        entryPoint.depositTo{value: msg.value}(address(this));

        emit MerchantDepositAdded(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw merchant deposit
     */
    function withdrawMerchantDeposit(uint256 _amount) external onlyRegisteredMerchant nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(merchantDeposits[msg.sender] >= _amount, "Insufficient deposit");
        require(merchantDeposits[msg.sender] - _amount >= minimumMerchantDeposit, "Must maintain minimum deposit");

        merchantDeposits[msg.sender] -= _amount;
        
        // Withdraw from EntryPoint
        // Note: This is simplified - actual implementation would need EntryPoint withdrawal
        payable(msg.sender).transfer(_amount);

        emit MerchantDepositWithdrawn(msg.sender, _amount);
    }

    /**
     * @dev Create a payment session for gas sponsorship
     */
    function createPaymentSession(
        address _customer,
        uint256 _amount,
        address _token
    ) external onlyRegisteredMerchant returns (bytes32) {
        require(_customer != address(0), "Invalid customer address");
        require(_amount > 0, "Amount must be greater than 0");
        require(merchantConfigs[msg.sender].isTokenAllowed[_token], "Token not allowed");

        bytes32 sessionId = keccak256(abi.encodePacked(
            msg.sender,
            _customer,
            _amount,
            _token,
            block.timestamp,
            block.number
        ));

        PaymentSession storage session = paymentSessions[sessionId];
        session.merchant = msg.sender;
        session.customer = _customer;
        session.amount = _amount;
        session.token = _token;
        session.timestamp = block.timestamp;
        session.completed = false;

        emit PaymentSessionCreated(sessionId, msg.sender, _customer);
        return sessionId;
    }

    /**
     * @dev Validate paymaster user operation (ERC-4337)
     */
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external onlyEntryPoint returns (bytes memory context, uint256 validationData) {
        // Decode paymaster data to get session ID
        require(userOp.paymasterAndData.length >= 52, "Invalid paymaster data");
        
        bytes32 sessionId;
        assembly {
            sessionId := calldataload(add(userOp.paymasterAndData.offset, 20))
        }

        PaymentSession storage session = paymentSessions[sessionId];
        require(session.merchant != address(0), "Invalid session");
        require(session.customer == userOp.sender, "Invalid customer");
        require(!session.completed, "Session already completed");

        MerchantConfig storage config = merchantConfigs[session.merchant];
        require(config.isActive, "Merchant not active");
        require(config.sponsorGas, "Gas sponsorship disabled");

        // Check daily limits
        resetDailyLimitIfNeeded(session.merchant);
        require(config.dailySpent + maxCost <= config.dailyLimit, "Daily limit exceeded");
        require(maxCost <= config.gasLimit, "Gas limit exceeded");

        // Check merchant has sufficient deposit
        require(merchantDeposits[session.merchant] >= maxCost, "Insufficient merchant deposit");

        // Update daily spent
        config.dailySpent += maxCost;
        session.gasSponsored = maxCost;

        emit GasSponsored(session.merchant, session.customer, maxCost, sessionId);

        // Return context for postOp
        return (abi.encode(sessionId, session.merchant, maxCost), 0);
    }

    /**
     * @dev Post-operation hook (ERC-4337)
     */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external onlyEntryPoint {
        (bytes32 sessionId, address merchant, uint256 maxCost) = abi.decode(context, (bytes32, address, uint256));
        
        PaymentSession storage session = paymentSessions[sessionId];
        session.completed = true;

        if (mode == PostOpMode.opSucceeded) {
            // Deduct actual gas cost from merchant deposit
            merchantDeposits[merchant] -= actualGasCost;
            emit PaymentSessionCompleted(sessionId, true);
        } else {
            // Refund unused gas allowance
            MerchantConfig storage config = merchantConfigs[merchant];
            config.dailySpent -= (maxCost - actualGasCost);
            merchantDeposits[merchant] -= actualGasCost;
            emit PaymentSessionCompleted(sessionId, false);
        }
    }

    /**
     * @dev Reset daily limit if a new day has started
     */
    function resetDailyLimitIfNeeded(address merchant) internal {
        MerchantConfig storage config = merchantConfigs[merchant];
        uint256 currentDay = getCurrentDay();
        
        if (currentDay > config.lastResetDay) {
            config.dailySpent = 0;
            config.lastResetDay = currentDay;
        }
    }

    /**
     * @dev Get current day number
     */
    function getCurrentDay() internal view returns (uint256) {
        return block.timestamp / 86400; // 24 hours in seconds
    }

    /**
     * @dev Check if merchant can sponsor gas for a transaction
     */
    function canSponsorGas(
        address merchant,
        uint256 gasAmount
    ) external view returns (bool) {
        MerchantConfig storage config = merchantConfigs[merchant];
        
        if (!config.isActive || !config.sponsorGas) {
            return false;
        }

        if (gasAmount > config.gasLimit) {
            return false;
        }

        uint256 currentDay = getCurrentDay();
        uint256 dailySpent = config.dailySpent;
        
        // Reset daily spent if new day
        if (currentDay > config.lastResetDay) {
            dailySpent = 0;
        }

        if (dailySpent + gasAmount > config.dailyLimit) {
            return false;
        }

        if (merchantDeposits[merchant] < gasAmount) {
            return false;
        }

        return true;
    }

    /**
     * @dev Get merchant configuration
     */
    function getMerchantConfig(address merchant) external view returns (
        bool isActive,
        bool sponsorGas,
        uint256 gasLimit,
        uint256 dailyLimit,
        uint256 dailySpent,
        uint256 deposit,
        address[] memory allowedTokens
    ) {
        MerchantConfig storage config = merchantConfigs[merchant];
        return (
            config.isActive,
            config.sponsorGas,
            config.gasLimit,
            config.dailyLimit,
            config.dailySpent,
            merchantDeposits[merchant],
            config.allowedTokens
        );
    }

    /**
     * @dev Admin functions
     */
    function setMaxGasPerTransaction(uint256 _maxGas) external onlyOwner {
        maxGasPerTransaction = _maxGas;
    }

    function setMaxDailyGasPerMerchant(uint256 _maxDailyGas) external onlyOwner {
        maxDailyGasPerMerchant = _maxDailyGas;
    }

    function setMinimumMerchantDeposit(uint256 _minimumDeposit) external onlyOwner {
        minimumMerchantDeposit = _minimumDeposit;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }

    // Receive function to accept ETH deposits
    receive() external payable {
        // Allow direct ETH deposits
    }
}

// PostOpMode enum for ERC-4337
enum PostOpMode {
    opSucceeded,
    opReverted,
    postOpReverted
}
