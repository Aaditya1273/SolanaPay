// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title VPayRewards
 * @dev Loyalty rewards and gamification contract for VPay
 */
contract VPayRewards is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    IERC20 public immutable vrcToken;
    
    enum UserTier {
        Bronze,
        Silver,
        Gold,
        Platinum
    }
    
    struct User {
        uint256 points;
        UserTier tier;
        uint256 totalEarned;
        uint256 lastActivityDay;
        uint256 streakDays;
        mapping(string => bool) achievements;
        mapping(uint256 => bool) claimedRewards;
    }
    
    struct Reward {
        uint256 id;
        string name;
        string description;
        uint256 pointsCost;
        uint256 tokenAmount;
        bool isActive;
        uint256 stock;
        UserTier minTier;
    }
    
    struct Achievement {
        string id;
        string name;
        string description;
        uint256 points;
        bool isActive;
    }
    
    mapping(address => User) public users;
    mapping(uint256 => Reward) public rewards;
    mapping(string => Achievement) public achievements;
    mapping(address => bool) public pointsManagers;
    
    uint256 public nextRewardId = 1;
    uint256 public totalPointsDistributed;
    uint256 public totalRewardsClaimed;
    
    // Tier thresholds
    uint256 public constant SILVER_THRESHOLD = 1000;
    uint256 public constant GOLD_THRESHOLD = 5000;
    uint256 public constant PLATINUM_THRESHOLD = 15000;
    
    // Daily rewards
    uint256 public constant DAILY_LOGIN_POINTS = 10;
    uint256 public constant STREAK_BONUS_MULTIPLIER = 2;
    uint256 public constant MAX_STREAK_BONUS = 7;
    
    event PointsAwarded(address indexed user, uint256 points, string reason);
    event TierUpgraded(address indexed user, UserTier newTier);
    event AchievementUnlocked(address indexed user, string achievementId);
    event RewardClaimed(address indexed user, uint256 rewardId, uint256 pointsCost);
    event RewardCreated(uint256 indexed rewardId, string name, uint256 pointsCost);
    event PointsManagerAdded(address indexed manager);
    event PointsManagerRemoved(address indexed manager);
    
    modifier onlyPointsManager() {
        require(pointsManagers[msg.sender], "VPayRewards: not authorized");
        _;
    }
    
    constructor(address _vrcToken, address initialOwner) Ownable(initialOwner) {
        require(_vrcToken != address(0), "VPayRewards: invalid token address");
        vrcToken = IERC20(_vrcToken);
        
        // Initialize default achievements
        _createAchievement("first_payment", "First Payment", "Send your first payment", 50);
        _createAchievement("task_master", "Task Master", "Complete 10 tasks", 200);
        _createAchievement("social_butterfly", "Social Butterfly", "Refer 5 friends", 300);
        _createAchievement("streak_warrior", "Streak Warrior", "Maintain 30-day login streak", 500);
        _createAchievement("big_spender", "Big Spender", "Spend 1000 VRC", 400);
    }
    
    /**
     * @dev Award points to user
     */
    function awardPoints(
        address user,
        uint256 points,
        string calldata reason
    ) external onlyPointsManager whenNotPaused {
        require(user != address(0), "VPayRewards: invalid user address");
        require(points > 0, "VPayRewards: points must be positive");
        
        users[user].points += points;
        users[user].totalEarned += points;
        totalPointsDistributed += points;
        
        // Check for tier upgrade
        _checkTierUpgrade(user);
        
        emit PointsAwarded(user, points, reason);
    }
    
    /**
     * @dev Claim daily login reward
     */
    function claimDailyReward() external whenNotPaused nonReentrant {
        User storage user = users[msg.sender];
        uint256 currentDay = block.timestamp / 1 days;
        
        require(user.lastActivityDay < currentDay, "VPayRewards: already claimed today");
        
        uint256 points = DAILY_LOGIN_POINTS;
        
        // Check for streak bonus
        if (user.lastActivityDay == currentDay - 1) {
            user.streakDays++;
            if (user.streakDays <= MAX_STREAK_BONUS) {
                points += (user.streakDays * STREAK_BONUS_MULTIPLIER);
            }
        } else {
            user.streakDays = 1;
        }
        
        user.lastActivityDay = currentDay;
        user.points += points;
        user.totalEarned += points;
        totalPointsDistributed += points;
        
        // Check for streak achievement
        if (user.streakDays == 30) {
            _unlockAchievement(msg.sender, "streak_warrior");
        }
        
        _checkTierUpgrade(msg.sender);
        
        emit PointsAwarded(msg.sender, points, "Daily login");
    }
    
    /**
     * @dev Unlock achievement for user
     */
    function unlockAchievement(
        address user,
        string calldata achievementId
    ) external onlyPointsManager whenNotPaused {
        _unlockAchievement(user, achievementId);
    }
    
    /**
     * @dev Create new reward
     */
    function createReward(
        string calldata name,
        string calldata description,
        uint256 pointsCost,
        uint256 tokenAmount,
        uint256 stock,
        UserTier minTier
    ) external onlyOwner returns (uint256) {
        require(pointsCost > 0, "VPayRewards: points cost must be positive");
        
        uint256 rewardId = nextRewardId++;
        
        rewards[rewardId] = Reward({
            id: rewardId,
            name: name,
            description: description,
            pointsCost: pointsCost,
            tokenAmount: tokenAmount,
            isActive: true,
            stock: stock,
            minTier: minTier
        });
        
        emit RewardCreated(rewardId, name, pointsCost);
        return rewardId;
    }
    
    /**
     * @dev Claim reward
     */
    function claimReward(uint256 rewardId) external whenNotPaused nonReentrant {
        Reward storage reward = rewards[rewardId];
        User storage user = users[msg.sender];
        
        require(reward.isActive, "VPayRewards: reward not active");
        require(reward.stock > 0, "VPayRewards: reward out of stock");
        require(user.points >= reward.pointsCost, "VPayRewards: insufficient points");
        require(user.tier >= reward.minTier, "VPayRewards: tier requirement not met");
        require(!user.claimedRewards[rewardId], "VPayRewards: reward already claimed");
        
        // Deduct points
        user.points -= reward.pointsCost;
        user.claimedRewards[rewardId] = true;
        
        // Decrease stock
        reward.stock--;
        totalRewardsClaimed++;
        
        // Transfer tokens if applicable
        if (reward.tokenAmount > 0) {
            vrcToken.safeTransfer(msg.sender, reward.tokenAmount);
        }
        
        emit RewardClaimed(msg.sender, rewardId, reward.pointsCost);
    }
    
    /**
     * @dev Add points manager
     */
    function addPointsManager(address manager) external onlyOwner {
        require(manager != address(0), "VPayRewards: invalid manager address");
        pointsManagers[manager] = true;
        emit PointsManagerAdded(manager);
    }
    
    /**
     * @dev Remove points manager
     */
    function removePointsManager(address manager) external onlyOwner {
        pointsManagers[manager] = false;
        emit PointsManagerRemoved(manager);
    }
    
    /**
     * @dev Update reward status
     */
    function updateRewardStatus(uint256 rewardId, bool isActive) external onlyOwner {
        rewards[rewardId].isActive = isActive;
    }
    
    /**
     * @dev Update reward stock
     */
    function updateRewardStock(uint256 rewardId, uint256 newStock) external onlyOwner {
        rewards[rewardId].stock = newStock;
    }
    
    /**
     * @dev Emergency withdraw tokens
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        vrcToken.safeTransfer(owner(), amount);
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
     * @dev Get user details
     */
    function getUserDetails(address user) external view returns (
        uint256 points,
        UserTier tier,
        uint256 totalEarned,
        uint256 streakDays
    ) {
        User storage userData = users[user];
        return (
            userData.points,
            userData.tier,
            userData.totalEarned,
            userData.streakDays
        );
    }
    
    /**
     * @dev Check if user has achievement
     */
    function hasAchievement(address user, string calldata achievementId) external view returns (bool) {
        return users[user].achievements[achievementId];
    }
    
    /**
     * @dev Check if user claimed reward
     */
    function hasClaimedReward(address user, uint256 rewardId) external view returns (bool) {
        return users[user].claimedRewards[rewardId];
    }
    
    /**
     * @dev Get reward details
     */
    function getReward(uint256 rewardId) external view returns (Reward memory) {
        return rewards[rewardId];
    }
    
    /**
     * @dev Internal function to check tier upgrade
     */
    function _checkTierUpgrade(address user) internal {
        User storage userData = users[user];
        UserTier currentTier = userData.tier;
        UserTier newTier = currentTier;
        
        if (userData.totalEarned >= PLATINUM_THRESHOLD && currentTier < UserTier.Platinum) {
            newTier = UserTier.Platinum;
        } else if (userData.totalEarned >= GOLD_THRESHOLD && currentTier < UserTier.Gold) {
            newTier = UserTier.Gold;
        } else if (userData.totalEarned >= SILVER_THRESHOLD && currentTier < UserTier.Silver) {
            newTier = UserTier.Silver;
        }
        
        if (newTier != currentTier) {
            userData.tier = newTier;
            emit TierUpgraded(user, newTier);
        }
    }
    
    /**
     * @dev Internal function to unlock achievement
     */
    function _unlockAchievement(address user, string memory achievementId) internal {
        require(achievements[achievementId].isActive, "VPayRewards: achievement not active");
        require(!users[user].achievements[achievementId], "VPayRewards: achievement already unlocked");
        
        users[user].achievements[achievementId] = true;
        
        uint256 points = achievements[achievementId].points;
        users[user].points += points;
        users[user].totalEarned += points;
        totalPointsDistributed += points;
        
        _checkTierUpgrade(user);
        
        emit AchievementUnlocked(user, achievementId);
        emit PointsAwarded(user, points, string(abi.encodePacked("Achievement: ", achievementId)));
    }
    
    /**
     * @dev Internal function to create achievement
     */
    function _createAchievement(
        string memory id,
        string memory name,
        string memory description,
        uint256 points
    ) internal {
        achievements[id] = Achievement({
            id: id,
            name: name,
            description: description,
            points: points,
            isActive: true
        });
    }
}
