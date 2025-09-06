// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title SolanaPayEscrow
 * @dev Escrow contract for SolanaPay mini-tasks and payments
 */
contract SolanaPayEscrow is ReentrancyGuard, Ownable, Pausable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    
    IERC20 public immutable vrcToken;
    
    uint256 public constant PLATFORM_FEE_RATE = 250; // 2.5% (250/10000)
    uint256 public constant MAX_FEE_RATE = 1000; // 10% maximum
    uint256 public constant DISPUTE_TIMEOUT = 7 days;
    
    address public feeRecipient;
    uint256 public platformFeeRate = PLATFORM_FEE_RATE;
    
    enum EscrowStatus {
        Created,
        Funded,
        InProgress,
        Completed,
        Disputed,
        Resolved,
        Cancelled,
        Refunded
    }
    
    struct Escrow {
        uint256 id;
        address client;
        address freelancer;
        uint256 amount;
        uint256 fee;
        EscrowStatus status;
        uint256 createdAt;
        uint256 deadline;
        string description;
        address arbiter;
        uint256 disputeCreatedAt;
    }
    
    mapping(uint256 => Escrow) public escrows;
    mapping(address => bool) public arbiters;
    
    uint256 public nextEscrowId = 1;
    uint256 public totalEscrows;
    uint256 public totalVolume;
    
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed client,
        address indexed freelancer,
        uint256 amount,
        uint256 deadline
    );
    
    event EscrowFunded(uint256 indexed escrowId, uint256 amount);
    event EscrowStarted(uint256 indexed escrowId);
    event EscrowCompleted(uint256 indexed escrowId);
    event EscrowDisputed(uint256 indexed escrowId, address indexed disputer);
    event EscrowResolved(uint256 indexed escrowId, address indexed winner, uint256 clientAmount, uint256 freelancerAmount);
    event EscrowCancelled(uint256 indexed escrowId);
    event EscrowRefunded(uint256 indexed escrowId, uint256 amount);
    
    event ArbiterAdded(address indexed arbiter);
    event ArbiterRemoved(address indexed arbiter);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    
    modifier onlyArbiter() {
        require(arbiters[msg.sender], "VPayEscrow: caller is not an arbiter");
        _;
    }
    
    modifier onlyEscrowParty(uint256 escrowId) {
        Escrow storage escrow = escrows[escrowId];
        require(
            msg.sender == escrow.client || msg.sender == escrow.freelancer,
            "VPayEscrow: not authorized"
        );
        _;
    }
    
    constructor(
        address _vrcToken,
        address _feeRecipient,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_vrcToken != address(0), "VPayEscrow: invalid token address");
        require(_feeRecipient != address(0), "VPayEscrow: invalid fee recipient");
        
        vrcToken = IERC20(_vrcToken);
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Create a new escrow
     */
    function createEscrow(
        address freelancer,
        uint256 amount,
        uint256 deadline,
        string calldata description
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(freelancer != address(0), "VPayEscrow: invalid freelancer address");
        require(freelancer != msg.sender, "VPayEscrow: cannot create escrow with yourself");
        require(amount > 0, "VPayEscrow: amount must be positive");
        require(deadline > block.timestamp, "VPayEscrow: deadline must be in future");
        
        uint256 fee = (amount * platformFeeRate) / 10000;
        uint256 totalAmount = amount + fee;
        
        uint256 escrowId = nextEscrowId++;
        
        escrows[escrowId] = Escrow({
            id: escrowId,
            client: msg.sender,
            freelancer: freelancer,
            amount: amount,
            fee: fee,
            status: EscrowStatus.Created,
            createdAt: block.timestamp,
            deadline: deadline,
            description: description,
            arbiter: address(0),
            disputeCreatedAt: 0
        });
        
        totalEscrows++;
        
        // Transfer tokens to escrow
        vrcToken.safeTransferFrom(msg.sender, address(this), totalAmount);
        
        escrows[escrowId].status = EscrowStatus.Funded;
        
        emit EscrowCreated(escrowId, msg.sender, freelancer, amount, deadline);
        emit EscrowFunded(escrowId, totalAmount);
        
        return escrowId;
    }
    
    /**
     * @dev Start work on escrow (freelancer accepts)
     */
    function startEscrow(uint256 escrowId) external whenNotPaused {
        Escrow storage escrow = escrows[escrowId];
        require(msg.sender == escrow.freelancer, "VPayEscrow: only freelancer can start");
        require(escrow.status == EscrowStatus.Funded, "VPayEscrow: invalid status");
        require(block.timestamp <= escrow.deadline, "VPayEscrow: deadline passed");
        
        escrow.status = EscrowStatus.InProgress;
        
        emit EscrowStarted(escrowId);
    }
    
    /**
     * @dev Complete escrow (client approves work)
     */
    function completeEscrow(uint256 escrowId) external whenNotPaused nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        require(msg.sender == escrow.client, "VPayEscrow: only client can complete");
        require(escrow.status == EscrowStatus.InProgress, "VPayEscrow: invalid status");
        
        escrow.status = EscrowStatus.Completed;
        totalVolume += escrow.amount;
        
        // Transfer payment to freelancer
        vrcToken.safeTransfer(escrow.freelancer, escrow.amount);
        
        // Transfer fee to platform
        if (escrow.fee > 0) {
            vrcToken.safeTransfer(feeRecipient, escrow.fee);
        }
        
        emit EscrowCompleted(escrowId);
    }
    
    /**
     * @dev Create dispute
     */
    function createDispute(uint256 escrowId) external whenNotPaused onlyEscrowParty(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        require(
            escrow.status == EscrowStatus.InProgress || escrow.status == EscrowStatus.Funded,
            "VPayEscrow: invalid status for dispute"
        );
        
        escrow.status = EscrowStatus.Disputed;
        escrow.disputeCreatedAt = block.timestamp;
        
        emit EscrowDisputed(escrowId, msg.sender);
    }
    
    /**
     * @dev Resolve dispute (arbiter only)
     */
    function resolveDispute(
        uint256 escrowId,
        uint256 clientAmount,
        uint256 freelancerAmount
    ) external onlyArbiter nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.Disputed, "VPayEscrow: not disputed");
        require(
            clientAmount + freelancerAmount <= escrow.amount,
            "VPayEscrow: amounts exceed escrow"
        );
        
        escrow.status = EscrowStatus.Resolved;
        escrow.arbiter = msg.sender;
        
        // Transfer amounts
        if (clientAmount > 0) {
            vrcToken.safeTransfer(escrow.client, clientAmount);
        }
        if (freelancerAmount > 0) {
            vrcToken.safeTransfer(escrow.freelancer, freelancerAmount);
        }
        
        // Remaining amount and fee go to platform
        uint256 remaining = escrow.amount - clientAmount - freelancerAmount + escrow.fee;
        if (remaining > 0) {
            vrcToken.safeTransfer(feeRecipient, remaining);
        }
        
        totalVolume += freelancerAmount;
        
        emit EscrowResolved(escrowId, msg.sender, clientAmount, freelancerAmount);
    }
    
    /**
     * @dev Cancel escrow (before freelancer starts)
     */
    function cancelEscrow(uint256 escrowId) external whenNotPaused nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        require(msg.sender == escrow.client, "VPayEscrow: only client can cancel");
        require(escrow.status == EscrowStatus.Funded, "VPayEscrow: invalid status");
        
        escrow.status = EscrowStatus.Cancelled;
        
        // Refund client (minus cancellation fee)
        uint256 cancellationFee = escrow.fee / 2; // 50% of platform fee
        uint256 refundAmount = escrow.amount + escrow.fee - cancellationFee;
        
        vrcToken.safeTransfer(escrow.client, refundAmount);
        
        if (cancellationFee > 0) {
            vrcToken.safeTransfer(feeRecipient, cancellationFee);
        }
        
        emit EscrowCancelled(escrowId);
    }
    
    /**
     * @dev Auto-refund after dispute timeout
     */
    function autoRefund(uint256 escrowId) external whenNotPaused nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.Disputed, "VPayEscrow: not disputed");
        require(
            block.timestamp >= escrow.disputeCreatedAt + DISPUTE_TIMEOUT,
            "VPayEscrow: dispute timeout not reached"
        );
        
        escrow.status = EscrowStatus.Refunded;
        
        // Refund client
        vrcToken.safeTransfer(escrow.client, escrow.amount);
        
        // Platform keeps the fee
        if (escrow.fee > 0) {
            vrcToken.safeTransfer(feeRecipient, escrow.fee);
        }
        
        emit EscrowRefunded(escrowId, escrow.amount);
    }
    
    /**
     * @dev Add arbiter
     */
    function addArbiter(address arbiter) external onlyOwner {
        require(arbiter != address(0), "VPayEscrow: invalid arbiter address");
        require(!arbiters[arbiter], "VPayEscrow: already an arbiter");
        
        arbiters[arbiter] = true;
        emit ArbiterAdded(arbiter);
    }
    
    /**
     * @dev Remove arbiter
     */
    function removeArbiter(address arbiter) external onlyOwner {
        require(arbiters[arbiter], "VPayEscrow: not an arbiter");
        
        arbiters[arbiter] = false;
        emit ArbiterRemoved(arbiter);
    }
    
    /**
     * @dev Update fee recipient
     */
    function updateFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "VPayEscrow: invalid recipient");
        
        address oldRecipient = feeRecipient;
        feeRecipient = newRecipient;
        
        emit FeeRecipientUpdated(oldRecipient, newRecipient);
    }
    
    /**
     * @dev Update platform fee rate
     */
    function updatePlatformFee(uint256 newFeeRate) external onlyOwner {
        require(newFeeRate <= MAX_FEE_RATE, "VPayEscrow: fee rate too high");
        
        uint256 oldFeeRate = platformFeeRate;
        platformFeeRate = newFeeRate;
        
        emit PlatformFeeUpdated(oldFeeRate, newFeeRate);
    }
    
    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get escrow details
     */
    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }
    
    /**
     * @dev Check if address is arbiter
     */
    function isArbiter(address account) external view returns (bool) {
        return arbiters[account];
    }
}
