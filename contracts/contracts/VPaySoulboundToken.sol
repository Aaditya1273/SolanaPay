// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title SolanaPaySoulboundToken
 * @dev Non-transferable Soulbound Tokens for loyalty achievements and reputation
 * Implements ERC721 but prevents transfers to make tokens soulbound
 */
contract SolanaPaySoulboundToken is ERC721, ERC721URIStorage, Ownable, Pausable {
    using Counters for Counters.Counter;
    using Strings for uint256;

    Counters.Counter private _tokenIdCounter;

    // Achievement types
    enum AchievementType {
        PAYMENT_MILESTONE,      // 10, 50, 100, 500, 1000 payments
        ACTIVITY_STREAK,        // 7, 30, 90, 365 day streaks
        VOLUME_MILESTONE,       // $1K, $10K, $100K volume
        LOYALTY_TIER,          // Bronze, Silver, Gold, Platinum
        MERCHANT_MILESTONE,    // First sale, 100 sales, etc.
        SPECIAL_EVENT,         // Launch participant, beta tester
        KYC_VERIFICATION,      // Identity verified
        REPUTATION_SCORE       // High reputation achievements
    }

    // Achievement metadata
    struct Achievement {
        AchievementType achievementType;
        uint256 level;              // Achievement level (e.g., 100 for 100 payments)
        string title;               // Human readable title
        string description;         // Achievement description
        uint256 timestamp;          // When achievement was earned
        bytes32 proofHash;          // Hash of proof data
        bool isRevoked;             // Can be revoked for violations
    }

    // User DID mapping
    mapping(address => string) public userDIDs;
    mapping(string => address) public didToAddress;
    
    // Token achievements
    mapping(uint256 => Achievement) public achievements;
    
    // User achievement tracking
    mapping(address => mapping(AchievementType => mapping(uint256 => bool))) public hasAchievement;
    mapping(address => uint256[]) public userTokens;
    mapping(address => uint256) public userAchievementCount;
    
    // Achievement definitions
    mapping(AchievementType => mapping(uint256 => string)) public achievementTitles;
    mapping(AchievementType => mapping(uint256 => string)) public achievementDescriptions;
    
    // Authorized issuers (can mint SBTs)
    mapping(address => bool) public authorizedIssuers;
    
    // Events
    event AchievementEarned(address indexed user, uint256 indexed tokenId, AchievementType achievementType, uint256 level);
    event DIDLinked(address indexed user, string did);
    event AchievementRevoked(uint256 indexed tokenId, string reason);
    event IssuerAuthorized(address indexed issuer, bool authorized);

    modifier onlyAuthorized() {
        require(authorizedIssuers[msg.sender] || msg.sender == owner(), "Not authorized to issue SBTs");
        _;
    }

    constructor() ERC721("SolanaPay Soulbound Token", "SSBT") {
        // Initialize achievement definitions
        _initializeAchievements();
        
        // Authorize contract owner as issuer
        authorizedIssuers[msg.sender] = true;
    }

    /**
     * @dev Initialize predefined achievement definitions
     */
    function _initializeAchievements() private {
        // Payment milestones
        achievementTitles[AchievementType.PAYMENT_MILESTONE][10] = "First Steps";
        achievementDescriptions[AchievementType.PAYMENT_MILESTONE][10] = "Completed 10 payments";
        
        achievementTitles[AchievementType.PAYMENT_MILESTONE][50] = "Getting Started";
        achievementDescriptions[AchievementType.PAYMENT_MILESTONE][50] = "Completed 50 payments";
        
        achievementTitles[AchievementType.PAYMENT_MILESTONE][100] = "Centurion";
        achievementDescriptions[AchievementType.PAYMENT_MILESTONE][100] = "Completed 100 payments";
        
        achievementTitles[AchievementType.PAYMENT_MILESTONE][500] = "Power User";
        achievementDescriptions[AchievementType.PAYMENT_MILESTONE][500] = "Completed 500 payments";
        
        achievementTitles[AchievementType.PAYMENT_MILESTONE][1000] = "SolanaPay Champion";
        achievementDescriptions[AchievementType.PAYMENT_MILESTONE][1000] = "Completed 1000 payments";

        // Activity streaks
        achievementTitles[AchievementType.ACTIVITY_STREAK][7] = "Weekly Warrior";
        achievementDescriptions[AchievementType.ACTIVITY_STREAK][7] = "7-day activity streak";
        
        achievementTitles[AchievementType.ACTIVITY_STREAK][30] = "Monthly Master";
        achievementDescriptions[AchievementType.ACTIVITY_STREAK][30] = "30-day activity streak";
        
        achievementTitles[AchievementType.ACTIVITY_STREAK][90] = "Quarterly Champion";
        achievementDescriptions[AchievementType.ACTIVITY_STREAK][90] = "90-day activity streak";
        
        achievementTitles[AchievementType.ACTIVITY_STREAK][365] = "Annual Legend";
        achievementDescriptions[AchievementType.ACTIVITY_STREAK][365] = "365-day activity streak";

        // Volume milestones
        achievementTitles[AchievementType.VOLUME_MILESTONE][1000] = "Thousand Club";
        achievementDescriptions[AchievementType.VOLUME_MILESTONE][1000] = "$1,000 transaction volume";
        
        achievementTitles[AchievementType.VOLUME_MILESTONE][10000] = "Ten K Club";
        achievementDescriptions[AchievementType.VOLUME_MILESTONE][10000] = "$10,000 transaction volume";
        
        achievementTitles[AchievementType.VOLUME_MILESTONE][100000] = "Hundred K Club";
        achievementDescriptions[AchievementType.VOLUME_MILESTONE][100000] = "$100,000 transaction volume";

        // Loyalty tiers
        achievementTitles[AchievementType.LOYALTY_TIER][1] = "Bronze Member";
        achievementDescriptions[AchievementType.LOYALTY_TIER][1] = "Achieved Bronze loyalty tier";
        
        achievementTitles[AchievementType.LOYALTY_TIER][2] = "Silver Member";
        achievementDescriptions[AchievementType.LOYALTY_TIER][2] = "Achieved Silver loyalty tier";
        
        achievementTitles[AchievementType.LOYALTY_TIER][3] = "Gold Member";
        achievementDescriptions[AchievementType.LOYALTY_TIER][3] = "Achieved Gold loyalty tier";
        
        achievementTitles[AchievementType.LOYALTY_TIER][4] = "Platinum Member";
        achievementDescriptions[AchievementType.LOYALTY_TIER][4] = "Achieved Platinum loyalty tier";

        // KYC and reputation
        achievementTitles[AchievementType.KYC_VERIFICATION][1] = "Verified Identity";
        achievementDescriptions[AchievementType.KYC_VERIFICATION][1] = "Successfully completed KYC verification";
        
        achievementTitles[AchievementType.REPUTATION_SCORE][100] = "Trusted User";
        achievementDescriptions[AchievementType.REPUTATION_SCORE][100] = "Achieved 100% reputation score";
    }

    /**
     * @dev Link user address to DID
     */
    function linkDID(string memory did) external {
        require(bytes(did).length > 0, "DID cannot be empty");
        require(didToAddress[did] == address(0), "DID already linked");
        require(bytes(userDIDs[msg.sender]).length == 0, "Address already has DID");
        
        userDIDs[msg.sender] = did;
        didToAddress[did] = msg.sender;
        
        emit DIDLinked(msg.sender, did);
    }

    /**
     * @dev Issue achievement SBT to user
     */
    function issueAchievement(
        address to,
        AchievementType achievementType,
        uint256 level,
        bytes32 proofHash
    ) external onlyAuthorized whenNotPaused {
        require(to != address(0), "Cannot issue to zero address");
        require(!hasAchievement[to][achievementType][level], "Achievement already earned");
        require(bytes(achievementTitles[achievementType][level]).length > 0, "Achievement not defined");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        // Create achievement
        achievements[tokenId] = Achievement({
            achievementType: achievementType,
            level: level,
            title: achievementTitles[achievementType][level],
            description: achievementDescriptions[achievementType][level],
            timestamp: block.timestamp,
            proofHash: proofHash,
            isRevoked: false
        });

        // Mark as earned
        hasAchievement[to][achievementType][level] = true;
        userTokens[to].push(tokenId);
        userAchievementCount[to]++;

        // Mint SBT
        _safeMint(to, tokenId);
        
        // Set metadata URI
        string memory uri = _generateTokenURI(tokenId);
        _setTokenURI(tokenId, uri);

        emit AchievementEarned(to, tokenId, achievementType, level);
    }

    /**
     * @dev Batch issue multiple achievements
     */
    function batchIssueAchievements(
        address[] memory recipients,
        AchievementType[] memory achievementTypes,
        uint256[] memory levels,
        bytes32[] memory proofHashes
    ) external onlyAuthorized whenNotPaused {
        require(
            recipients.length == achievementTypes.length &&
            achievementTypes.length == levels.length &&
            levels.length == proofHashes.length,
            "Array lengths mismatch"
        );

        for (uint256 i = 0; i < recipients.length; i++) {
            if (!hasAchievement[recipients[i]][achievementTypes[i]][levels[i]]) {
                issueAchievement(recipients[i], achievementTypes[i], levels[i], proofHashes[i]);
            }
        }
    }

    /**
     * @dev Revoke achievement (for violations)
     */
    function revokeAchievement(uint256 tokenId, string memory reason) external onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        require(!achievements[tokenId].isRevoked, "Achievement already revoked");
        
        achievements[tokenId].isRevoked = true;
        
        // Remove from user's achievement count
        address owner = ownerOf(tokenId);
        userAchievementCount[owner]--;
        
        emit AchievementRevoked(tokenId, reason);
    }

    /**
     * @dev Generate metadata URI for token
     */
    function _generateTokenURI(uint256 tokenId) private view returns (string memory) {
        Achievement memory achievement = achievements[tokenId];
        
        // In production, this would point to IPFS or a metadata service
        return string(abi.encodePacked(
            "https://api.vpay.com/sbt/metadata/",
            tokenId.toString(),
            "?type=",
            uint256(achievement.achievementType).toString(),
            "&level=",
            achievement.level.toString()
        ));
    }

    /**
     * @dev Get user's achievements
     */
    function getUserAchievements(address user) external view returns (uint256[] memory) {
        return userTokens[user];
    }

    /**
     * @dev Get achievement details
     */
    function getAchievement(uint256 tokenId) external view returns (Achievement memory) {
        require(_exists(tokenId), "Token does not exist");
        return achievements[tokenId];
    }

    /**
     * @dev Check if user has specific achievement
     */
    function hasSpecificAchievement(
        address user,
        AchievementType achievementType,
        uint256 level
    ) external view returns (bool) {
        return hasAchievement[user][achievementType][level];
    }

    /**
     * @dev Get user's reputation score based on achievements
     */
    function getUserReputationScore(address user) external view returns (uint256) {
        uint256 score = 0;
        uint256[] memory tokens = userTokens[user];
        
        for (uint256 i = 0; i < tokens.length; i++) {
            Achievement memory achievement = achievements[tokens[i]];
            if (!achievement.isRevoked) {
                // Different achievement types have different score weights
                if (achievement.achievementType == AchievementType.KYC_VERIFICATION) {
                    score += 100;
                } else if (achievement.achievementType == AchievementType.PAYMENT_MILESTONE) {
                    score += achievement.level / 10; // 1 point per 10 payments
                } else if (achievement.achievementType == AchievementType.ACTIVITY_STREAK) {
                    score += achievement.level / 7; // 1 point per week
                } else if (achievement.achievementType == AchievementType.VOLUME_MILESTONE) {
                    score += achievement.level / 1000; // 1 point per $1K volume
                } else if (achievement.achievementType == AchievementType.LOYALTY_TIER) {
                    score += achievement.level * 50; // 50 points per tier
                } else {
                    score += 10; // Default points for other achievements
                }
            }
        }
        
        return score;
    }

    /**
     * @dev Authorize/deauthorize SBT issuer
     */
    function setAuthorizedIssuer(address issuer, bool authorized) external onlyOwner {
        authorizedIssuers[issuer] = authorized;
        emit IssuerAuthorized(issuer, authorized);
    }

    /**
     * @dev Add new achievement definition
     */
    function addAchievementDefinition(
        AchievementType achievementType,
        uint256 level,
        string memory title,
        string memory description
    ) external onlyOwner {
        achievementTitles[achievementType][level] = title;
        achievementDescriptions[achievementType][level] = description;
    }

    /**
     * @dev Override transfers to make tokens soulbound
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        require(from == address(0) || to == address(0), "Soulbound tokens cannot be transferred");
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    /**
     * @dev Disable approve functions for soulbound tokens
     */
    function approve(address, uint256) public pure override {
        revert("Soulbound tokens cannot be approved");
    }

    function setApprovalForAll(address, bool) public pure override {
        revert("Soulbound tokens cannot be approved");
    }

    function getApproved(uint256) public pure override returns (address) {
        return address(0);
    }

    function isApprovedForAll(address, address) public pure override returns (bool) {
        return false;
    }

    /**
     * @dev Override required by Solidity
     */
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Pause/unpause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
