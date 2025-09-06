// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorSettingsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorCountingSimpleUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesQuorumFractionUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorTimelockControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./RWAFractionalOwnership.sol";

/**
 * @title RWAGovernance
 * @dev DAO-style governance contract for RWA fractional ownership decisions
 * Handles asset liquidation, valuation updates, yield distribution, and other critical decisions
 */
contract RWAGovernance is
    Initializable,
    GovernorUpgradeable,
    GovernorSettingsUpgradeable,
    GovernorCountingSimpleUpgradeable,
    GovernorVotesUpgradeable,
    GovernorVotesQuorumFractionUpgradeable,
    GovernorTimelockControlUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    enum ProposalType {
        VALUATION_UPDATE,
        ASSET_LIQUIDATION,
        YIELD_DISTRIBUTION,
        GOVERNANCE_PARAMETER,
        EMERGENCY_ACTION,
        ASSET_MANAGEMENT
    }

    struct ProposalMetadata {
        uint256 assetId;
        ProposalType proposalType;
        uint256 newValuation;
        uint256 liquidationPrice;
        uint256 yieldAmount;
        string description;
        address proposer;
        uint256 createdAt;
        bool executed;
        mapping(address => bool) hasVoted;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
    }

    struct AssetGovernanceConfig {
        uint256 minProposalThreshold; // Minimum shares to create proposal
        uint256 votingDelay; // Delay before voting starts
        uint256 votingPeriod; // Duration of voting
        uint256 quorumFraction; // Quorum required (in basis points)
        bool emergencyPause;
        address assetManager;
    }

    // State variables
    RWAFractionalOwnership public fractionalOwnership;
    mapping(uint256 => ProposalMetadata) public proposalMetadata;
    mapping(uint256 => AssetGovernanceConfig) public assetConfigs;
    mapping(uint256 => uint256[]) public assetProposals;
    
    uint256 public nextProposalId;
    uint256 public defaultMinProposalThreshold;
    uint256 public defaultVotingDelay;
    uint256 public defaultVotingPeriod;
    uint256 public defaultQuorumFraction;
    
    // Events
    event ProposalCreatedWithMetadata(
        uint256 indexed proposalId,
        uint256 indexed assetId,
        ProposalType proposalType,
        address indexed proposer,
        string description
    );
    
    event ValuationUpdateExecuted(
        uint256 indexed assetId,
        uint256 oldValuation,
        uint256 newValuation,
        uint256 proposalId
    );
    
    event AssetLiquidationExecuted(
        uint256 indexed assetId,
        uint256 liquidationPrice,
        uint256 proposalId
    );
    
    event YieldDistributionExecuted(
        uint256 indexed assetId,
        uint256 yieldAmount,
        uint256 proposalId
    );
    
    event AssetGovernanceConfigUpdated(
        uint256 indexed assetId,
        uint256 minProposalThreshold,
        uint256 votingDelay,
        uint256 votingPeriod,
        uint256 quorumFraction
    );
    
    event EmergencyPauseToggled(uint256 indexed assetId, bool paused);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _fractionalOwnership,
        address _timelock,
        address initialOwner
    ) public initializer {
        __Governor_init("RWAGovernance");
        __GovernorSettings_init(1, 50400, 0); // 1 block delay, ~1 week voting period
        __GovernorCountingSimple_init();
        __GovernorVotes_init(IVotes(_fractionalOwnership));
        __GovernorVotesQuorumFraction_init(4); // 4% quorum
        __GovernorTimelockControl_init(TimelockControllerUpgradeable(payable(_timelock)));
        __Ownable_init(initialOwner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        fractionalOwnership = RWAFractionalOwnership(_fractionalOwnership);
        nextProposalId = 1;
        defaultMinProposalThreshold = 100; // 100 shares minimum
        defaultVotingDelay = 1; // 1 block
        defaultVotingPeriod = 50400; // ~1 week
        defaultQuorumFraction = 400; // 4%
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Create a proposal for asset valuation update
     */
    function proposeValuationUpdate(
        uint256 assetId,
        uint256 newValuation,
        string memory description
    ) external returns (uint256 proposalId) {
        require(_hasMinimumShares(assetId, msg.sender), "Insufficient shares to propose");
        require(newValuation > 0, "Invalid valuation");
        
        // Create the proposal call data
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = address(fractionalOwnership);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSignature(
            "updateAssetValuation(uint256,uint256)",
            assetId,
            newValuation
        );
        
        proposalId = propose(targets, values, calldatas, description);
        
        // Store proposal metadata
        ProposalMetadata storage metadata = proposalMetadata[proposalId];
        metadata.assetId = assetId;
        metadata.proposalType = ProposalType.VALUATION_UPDATE;
        metadata.newValuation = newValuation;
        metadata.description = description;
        metadata.proposer = msg.sender;
        metadata.createdAt = block.timestamp;
        
        assetProposals[assetId].push(proposalId);
        
        emit ProposalCreatedWithMetadata(
            proposalId,
            assetId,
            ProposalType.VALUATION_UPDATE,
            msg.sender,
            description
        );
        
        return proposalId;
    }

    /**
     * @dev Create a proposal for asset liquidation
     */
    function proposeAssetLiquidation(
        uint256 assetId,
        uint256 liquidationPrice,
        string memory description
    ) external returns (uint256 proposalId) {
        require(_hasMinimumShares(assetId, msg.sender), "Insufficient shares to propose");
        require(liquidationPrice > 0, "Invalid liquidation price");
        
        // Create the proposal call data for liquidation process
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = address(this);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSignature(
            "executeLiquidation(uint256,uint256)",
            assetId,
            liquidationPrice
        );
        
        proposalId = propose(targets, values, calldatas, description);
        
        // Store proposal metadata
        ProposalMetadata storage metadata = proposalMetadata[proposalId];
        metadata.assetId = assetId;
        metadata.proposalType = ProposalType.ASSET_LIQUIDATION;
        metadata.liquidationPrice = liquidationPrice;
        metadata.description = description;
        metadata.proposer = msg.sender;
        metadata.createdAt = block.timestamp;
        
        assetProposals[assetId].push(proposalId);
        
        emit ProposalCreatedWithMetadata(
            proposalId,
            assetId,
            ProposalType.ASSET_LIQUIDATION,
            msg.sender,
            description
        );
        
        return proposalId;
    }

    /**
     * @dev Create a proposal for yield distribution
     */
    function proposeYieldDistribution(
        uint256 assetId,
        uint256 yieldAmount,
        string memory description
    ) external payable returns (uint256 proposalId) {
        require(_hasMinimumShares(assetId, msg.sender), "Insufficient shares to propose");
        require(msg.value == yieldAmount && yieldAmount > 0, "Invalid yield amount");
        
        // Create the proposal call data
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = address(fractionalOwnership);
        values[0] = yieldAmount;
        calldatas[0] = abi.encodeWithSignature(
            "distributeDividends(uint256)",
            assetId
        );
        
        proposalId = propose(targets, values, calldatas, description);
        
        // Store proposal metadata
        ProposalMetadata storage metadata = proposalMetadata[proposalId];
        metadata.assetId = assetId;
        metadata.proposalType = ProposalType.YIELD_DISTRIBUTION;
        metadata.yieldAmount = yieldAmount;
        metadata.description = description;
        metadata.proposer = msg.sender;
        metadata.createdAt = block.timestamp;
        
        assetProposals[assetId].push(proposalId);
        
        emit ProposalCreatedWithMetadata(
            proposalId,
            assetId,
            ProposalType.YIELD_DISTRIBUTION,
            msg.sender,
            description
        );
        
        return proposalId;
    }

    /**
     * @dev Execute asset liquidation (called by governance)
     */
    function executeLiquidation(
        uint256 assetId,
        uint256 liquidationPrice
    ) external onlyGovernance {
        // Deactivate the asset
        fractionalOwnership.deactivateAsset(assetId);
        
        // Calculate liquidation proceeds per share
        uint256 totalSupply = fractionalOwnership.totalSupply(assetId);
        require(totalSupply > 0, "No shares outstanding");
        
        uint256 proceedsPerShare = liquidationPrice / totalSupply;
        
        // Distribute liquidation proceeds as dividends
        fractionalOwnership.distributeDividends{value: liquidationPrice}(assetId);
        
        emit AssetLiquidationExecuted(assetId, liquidationPrice, _getCurrentProposalId());
    }

    /**
     * @dev Cast vote with additional metadata tracking
     */
    function castVoteWithMetadata(
        uint256 proposalId,
        uint8 support,
        string memory reason
    ) public returns (uint256) {
        ProposalMetadata storage metadata = proposalMetadata[proposalId];
        require(!metadata.hasVoted[msg.sender], "Already voted");
        
        uint256 weight = castVote(proposalId, support);
        
        metadata.hasVoted[msg.sender] = true;
        
        if (support == 0) {
            metadata.againstVotes += weight;
        } else if (support == 1) {
            metadata.forVotes += weight;
        } else {
            metadata.abstainVotes += weight;
        }
        
        return weight;
    }

    /**
     * @dev Configure governance parameters for a specific asset
     */
    function configureAssetGovernance(
        uint256 assetId,
        uint256 minProposalThreshold,
        uint256 votingDelay,
        uint256 votingPeriod,
        uint256 quorumFraction,
        address assetManager
    ) external onlyOwner {
        AssetGovernanceConfig storage config = assetConfigs[assetId];
        config.minProposalThreshold = minProposalThreshold;
        config.votingDelay = votingDelay;
        config.votingPeriod = votingPeriod;
        config.quorumFraction = quorumFraction;
        config.assetManager = assetManager;
        
        emit AssetGovernanceConfigUpdated(
            assetId,
            minProposalThreshold,
            votingDelay,
            votingPeriod,
            quorumFraction
        );
    }

    /**
     * @dev Emergency pause for an asset
     */
    function emergencyPause(uint256 assetId, bool pause) external {
        require(
            msg.sender == owner() || 
            msg.sender == assetConfigs[assetId].assetManager,
            "Not authorized"
        );
        
        assetConfigs[assetId].emergencyPause = pause;
        emit EmergencyPauseToggled(assetId, pause);
    }

    /**
     * @dev Check if address has minimum shares to create proposals
     */
    function _hasMinimumShares(uint256 assetId, address account) internal view returns (bool) {
        uint256 minThreshold = assetConfigs[assetId].minProposalThreshold;
        if (minThreshold == 0) {
            minThreshold = defaultMinProposalThreshold;
        }
        
        return fractionalOwnership.balanceOf(account, assetId) >= minThreshold;
    }

    /**
     * @dev Get current proposal ID (helper function)
     */
    function _getCurrentProposalId() internal view returns (uint256) {
        return nextProposalId - 1;
    }

    // View functions
    function getProposalMetadata(uint256 proposalId) external view returns (
        uint256 assetId,
        ProposalType proposalType,
        uint256 newValuation,
        uint256 liquidationPrice,
        uint256 yieldAmount,
        string memory description,
        address proposer,
        uint256 createdAt,
        bool executed,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes
    ) {
        ProposalMetadata storage metadata = proposalMetadata[proposalId];
        return (
            metadata.assetId,
            metadata.proposalType,
            metadata.newValuation,
            metadata.liquidationPrice,
            metadata.yieldAmount,
            metadata.description,
            metadata.proposer,
            metadata.createdAt,
            metadata.executed,
            metadata.forVotes,
            metadata.againstVotes,
            metadata.abstainVotes
        );
    }

    function getAssetProposals(uint256 assetId) external view returns (uint256[] memory) {
        return assetProposals[assetId];
    }

    function getAssetGovernanceConfig(uint256 assetId) external view returns (
        uint256 minProposalThreshold,
        uint256 votingDelay,
        uint256 votingPeriod,
        uint256 quorumFraction,
        bool emergencyPause,
        address assetManager
    ) {
        AssetGovernanceConfig storage config = assetConfigs[assetId];
        return (
            config.minProposalThreshold,
            config.votingDelay,
            config.votingPeriod,
            config.quorumFraction,
            config.emergencyPause,
            config.assetManager
        );
    }

    function hasVoted(uint256 proposalId, address account) external view returns (bool) {
        return proposalMetadata[proposalId].hasVoted[account];
    }

    function getVotingPower(uint256 assetId, address account) external view returns (uint256) {
        return fractionalOwnership.balanceOf(account, assetId);
    }

    // Required overrides
    function votingDelay() public view override(IGovernorUpgradeable, GovernorSettingsUpgradeable) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(IGovernorUpgradeable, GovernorSettingsUpgradeable) returns (uint256) {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber) public view override(IGovernorUpgradeable, GovernorVotesQuorumFractionUpgradeable) returns (uint256) {
        return super.quorum(blockNumber);
    }

    function proposalThreshold() public view override(GovernorUpgradeable, GovernorSettingsUpgradeable) returns (uint256) {
        return super.proposalThreshold();
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) {
        proposalMetadata[proposalId].executed = true;
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor() internal view override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (address) {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId) public view override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // Admin functions
    function setDefaultParameters(
        uint256 _defaultMinProposalThreshold,
        uint256 _defaultVotingDelay,
        uint256 _defaultVotingPeriod,
        uint256 _defaultQuorumFraction
    ) external onlyOwner {
        defaultMinProposalThreshold = _defaultMinProposalThreshold;
        defaultVotingDelay = _defaultVotingDelay;
        defaultVotingPeriod = _defaultVotingPeriod;
        defaultQuorumFraction = _defaultQuorumFraction;
    }

    receive() external payable {}
}
