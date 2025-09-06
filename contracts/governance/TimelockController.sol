// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title RWATimelockController
 * @dev Timelock controller for RWA governance with enhanced security features
 */
contract RWATimelockController is 
    Initializable,
    TimelockControllerUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    mapping(bytes32 => bool) public emergencyOperations;
    mapping(address => bool) public emergencyExecutors;
    
    uint256 public emergencyDelay;
    bool public emergencyMode;
    
    event EmergencyModeToggled(bool enabled);
    event EmergencyExecutorSet(address indexed executor, bool enabled);
    event EmergencyOperationScheduled(bytes32 indexed id, uint256 delay);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin,
        address initialOwner
    ) public initializer {
        __TimelockController_init(minDelay, proposers, executors, admin);
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        
        emergencyDelay = 1 hours; // Shorter delay for emergency operations
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Schedule emergency operation with reduced delay
     */
    function scheduleEmergency(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt
    ) external returns (bytes32) {
        require(emergencyExecutors[msg.sender], "Not emergency executor");
        require(emergencyMode, "Emergency mode not active");
        
        bytes32 id = hashOperation(target, value, data, predecessor, salt);
        emergencyOperations[id] = true;
        
        _schedule(id, emergencyDelay);
        
        emit EmergencyOperationScheduled(id, emergencyDelay);
        return id;
    }

    /**
     * @dev Execute emergency operation
     */
    function executeEmergency(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt
    ) external payable {
        bytes32 id = hashOperation(target, value, data, predecessor, salt);
        require(emergencyOperations[id], "Not emergency operation");
        require(emergencyExecutors[msg.sender], "Not emergency executor");
        
        execute(target, value, data, predecessor, salt);
        delete emergencyOperations[id];
    }

    /**
     * @dev Toggle emergency mode
     */
    function toggleEmergencyMode() external onlyOwner {
        emergencyMode = !emergencyMode;
        emit EmergencyModeToggled(emergencyMode);
    }

    /**
     * @dev Set emergency executor
     */
    function setEmergencyExecutor(address executor, bool enabled) external onlyOwner {
        emergencyExecutors[executor] = enabled;
        emit EmergencyExecutorSet(executor, enabled);
    }

    /**
     * @dev Set emergency delay
     */
    function setEmergencyDelay(uint256 delay) external onlyOwner {
        require(delay >= 1 hours && delay <= 24 hours, "Invalid delay");
        emergencyDelay = delay;
    }

    /**
     * @dev Override getMinDelay to use emergency delay when applicable
     */
    function getMinDelay() public view override returns (uint256) {
        if (emergencyMode) {
            return emergencyDelay;
        }
        return super.getMinDelay();
    }
}
