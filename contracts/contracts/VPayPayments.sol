// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title SolanaPayPayments
 * @dev A secure payment contract for the SolanaPay ecosystem
 * @notice This contract handles deposits, transfers, and withdrawals with security features
 */
contract SolanaPayPayments is ReentrancyGuard, Ownable, Pausable {
    using SafeMath for uint256;

    // State variables
    mapping(address => uint256) private balances;
    mapping(address => bool) public authorizedOperators;
    
    uint256 public totalDeposits;
    uint256 public totalWithdrawals;
    uint256 public transactionCount;
    
    // Fee structure (in basis points, 100 = 1%)
    uint256 public transferFee = 25; // 0.25%
    uint256 public withdrawalFee = 50; // 0.5%
    uint256 public constant MAX_FEE = 500; // 5% maximum fee
    
    address public feeRecipient;

    // Events
    event Deposit(
        address indexed user, 
        uint256 amount, 
        uint256 timestamp,
        uint256 newBalance
    );
    
    event Transfer(
        address indexed from, 
        address indexed to, 
        uint256 amount, 
        uint256 fee,
        uint256 timestamp,
        uint256 transactionId
    );
    
    event Withdrawal(
        address indexed user, 
        uint256 amount, 
        uint256 fee,
        uint256 timestamp,
        uint256 newBalance
    );
    
    event FeeUpdated(
        string feeType, 
        uint256 oldFee, 
        uint256 newFee, 
        address updatedBy
    );
    
    event OperatorUpdated(
        address indexed operator, 
        bool authorized, 
        address updatedBy
    );

    event EmergencyWithdrawal(
        address indexed user,
        uint256 amount,
        address withdrawnBy
    );

    // Modifiers
    modifier onlyAuthorized() {
        require(
            authorizedOperators[msg.sender] || msg.sender == owner(),
            "SolanaPayPayments: Not authorized"
        );
        _;
    }

    modifier validAddress(address _address) {
        require(_address != address(0), "SolanaPayPayments: Invalid address");
        _;
    }

    modifier sufficientBalance(uint256 _amount) {
        require(
            balances[msg.sender] >= _amount,
            "SolanaPayPayments: Insufficient balance"
        );
        _;
    }

    /**
     * @dev Constructor sets the initial owner and fee recipient
     * @param _feeRecipient Address to receive collected fees
     */
    constructor(address _feeRecipient) {
        require(_feeRecipient != address(0), "SolanaPayPayments: Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Deposit ETH into the contract
     * @notice Users can deposit ETH to their balance
     */
    function deposit() external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "SolanaPayPayments: Deposit amount must be greater than 0");
        
        balances[msg.sender] = balances[msg.sender].add(msg.value);
        totalDeposits = totalDeposits.add(msg.value);
        
        emit Deposit(msg.sender, msg.value, block.timestamp, balances[msg.sender]);
    }

    /**
     * @dev Transfer funds to another user
     * @param _recipient Address to receive the transfer
     * @param _amount Amount to transfer (excluding fees)
     */
    function transfer(address _recipient, uint256 _amount) 
        external 
        nonReentrant 
        whenNotPaused 
        validAddress(_recipient)
        sufficientBalance(_amount)
    {
        require(_amount > 0, "VPayPayments: Transfer amount must be greater than 0");
        require(_recipient != msg.sender, "VPayPayments: Cannot transfer to yourself");
        
        // Calculate fee
        uint256 fee = _amount.mul(transferFee).div(10000);
        uint256 totalRequired = _amount.add(fee);
        
        require(
            balances[msg.sender] >= totalRequired,
            "VPayPayments: Insufficient balance including fees"
        );
        
        // Update balances
        balances[msg.sender] = balances[msg.sender].sub(totalRequired);
        balances[_recipient] = balances[_recipient].add(_amount);
        
        // Transfer fee to fee recipient
        if (fee > 0) {
            balances[feeRecipient] = balances[feeRecipient].add(fee);
        }
        
        transactionCount = transactionCount.add(1);
        
        emit Transfer(
            msg.sender, 
            _recipient, 
            _amount, 
            fee, 
            block.timestamp, 
            transactionCount
        );
    }

    /**
     * @dev Withdraw ETH from the contract
     * @param _amount Amount to withdraw (excluding fees)
     */
    function withdraw(uint256 _amount) 
        external 
        nonReentrant 
        whenNotPaused 
        sufficientBalance(_amount)
    {
        require(_amount > 0, "VPayPayments: Withdrawal amount must be greater than 0");
        
        // Calculate fee
        uint256 fee = _amount.mul(withdrawalFee).div(10000);
        uint256 totalRequired = _amount.add(fee);
        
        require(
            balances[msg.sender] >= totalRequired,
            "VPayPayments: Insufficient balance including fees"
        );
        
        // Update balances
        balances[msg.sender] = balances[msg.sender].sub(totalRequired);
        totalWithdrawals = totalWithdrawals.add(_amount);
        
        // Transfer fee to fee recipient
        if (fee > 0) {
            balances[feeRecipient] = balances[feeRecipient].add(fee);
        }
        
        // Transfer ETH to user
        (bool success, ) = payable(msg.sender).call{value: _amount}("");
        require(success, "VPayPayments: ETH transfer failed");
        
        emit Withdrawal(
            msg.sender, 
            _amount, 
            fee, 
            block.timestamp, 
            balances[msg.sender]
        );
    }

    /**
     * @dev Get balance of a user
     * @param _user Address to check balance for
     * @return User's current balance
     */
    function balanceOf(address _user) external view returns (uint256) {
        return balances[_user];
    }

    /**
     * @dev Get contract's total ETH balance
     * @return Total ETH held in contract
     */
    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Calculate transfer fee for a given amount
     * @param _amount Amount to calculate fee for
     * @return Calculated fee amount
     */
    function calculateTransferFee(uint256 _amount) external view returns (uint256) {
        return _amount.mul(transferFee).div(10000);
    }

    /**
     * @dev Calculate withdrawal fee for a given amount
     * @param _amount Amount to calculate fee for
     * @return Calculated fee amount
     */
    function calculateWithdrawalFee(uint256 _amount) external view returns (uint256) {
        return _amount.mul(withdrawalFee).div(10000);
    }

    // Admin functions

    /**
     * @dev Update transfer fee (only owner)
     * @param _newFee New fee in basis points
     */
    function updateTransferFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= MAX_FEE, "VPayPayments: Fee exceeds maximum");
        uint256 oldFee = transferFee;
        transferFee = _newFee;
        emit FeeUpdated("transfer", oldFee, _newFee, msg.sender);
    }

    /**
     * @dev Update withdrawal fee (only owner)
     * @param _newFee New fee in basis points
     */
    function updateWithdrawalFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= MAX_FEE, "VPayPayments: Fee exceeds maximum");
        uint256 oldFee = withdrawalFee;
        withdrawalFee = _newFee;
        emit FeeUpdated("withdrawal", oldFee, _newFee, msg.sender);
    }

    /**
     * @dev Update fee recipient address (only owner)
     * @param _newFeeRecipient New fee recipient address
     */
    function updateFeeRecipient(address _newFeeRecipient) 
        external 
        onlyOwner 
        validAddress(_newFeeRecipient) 
    {
        feeRecipient = _newFeeRecipient;
    }

    /**
     * @dev Authorize or deauthorize an operator (only owner)
     * @param _operator Address to update authorization for
     * @param _authorized True to authorize, false to deauthorize
     */
    function updateOperator(address _operator, bool _authorized) 
        external 
        onlyOwner 
        validAddress(_operator) 
    {
        authorizedOperators[_operator] = _authorized;
        emit OperatorUpdated(_operator, _authorized, msg.sender);
    }

    /**
     * @dev Pause the contract (only authorized)
     */
    function pause() external onlyAuthorized {
        _pause();
    }

    /**
     * @dev Unpause the contract (only authorized)
     */
    function unpause() external onlyAuthorized {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal function (only owner, when paused)
     * @param _user User address to withdraw funds for
     */
    function emergencyWithdraw(address _user) 
        external 
        onlyOwner 
        whenPaused 
        validAddress(_user) 
    {
        uint256 userBalance = balances[_user];
        require(userBalance > 0, "VPayPayments: No balance to withdraw");
        
        balances[_user] = 0;
        
        (bool success, ) = payable(_user).call{value: userBalance}("");
        require(success, "VPayPayments: Emergency withdrawal failed");
        
        emit EmergencyWithdrawal(_user, userBalance, msg.sender);
    }

    /**
     * @dev Get contract statistics
     * @return totalDeposits_ Total deposits made
     * @return totalWithdrawals_ Total withdrawals made
     * @return transactionCount_ Total number of transfers
     * @return contractBalance_ Current contract ETH balance
     */
    function getContractStats() 
        external 
        view 
        returns (
            uint256 totalDeposits_,
            uint256 totalWithdrawals_,
            uint256 transactionCount_,
            uint256 contractBalance_
        ) 
    {
        return (
            totalDeposits,
            totalWithdrawals,
            transactionCount,
            address(this).balance
        );
    }

    /**
     * @dev Fallback function to receive ETH
     */
    receive() external payable {
        // Automatically deposit received ETH
        if (msg.value > 0) {
            balances[msg.sender] = balances[msg.sender].add(msg.value);
            totalDeposits = totalDeposits.add(msg.value);
            emit Deposit(msg.sender, msg.value, block.timestamp, balances[msg.sender]);
        }
    }
}
