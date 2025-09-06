// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SolanaPayToken
 * @dev VRC (VeryPay Coin) - The native token for SolanaPay ecosystem
 */
contract SolanaPayToken is ERC20, ERC20Burnable, ERC20Pausable, Ownable, ReentrancyGuard {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10**18; // 100 million tokens
    
    mapping(address => bool) public minters;
    mapping(address => uint256) public dailyMintLimits;
    mapping(address => uint256) public dailyMinted;
    mapping(address => uint256) public lastMintDay;
    
    event MinterAdded(address indexed minter, uint256 dailyLimit);
    event MinterRemoved(address indexed minter);
    event DailyLimitUpdated(address indexed minter, uint256 newLimit);
    
    modifier onlyMinter() {
        require(minters[msg.sender], "SolanaPayToken: caller is not a minter");
        _;
    }
    
    constructor(address initialOwner) ERC20("VeryPay Coin", "VRC") Ownable(initialOwner) {
        _mint(initialOwner, INITIAL_SUPPLY);
    }
    
    /**
     * @dev Add a new minter with daily mint limit
     */
    function addMinter(address minter, uint256 dailyLimit) external onlyOwner {
        require(minter != address(0), "SolanaPayToken: minter is zero address");
        require(dailyLimit > 0, "SolanaPayToken: daily limit must be positive");
        
        minters[minter] = true;
        dailyMintLimits[minter] = dailyLimit;
        
        emit MinterAdded(minter, dailyLimit);
    }
    
    /**
     * @dev Remove a minter
     */
    function removeMinter(address minter) external onlyOwner {
        require(minters[minter], "SolanaPayToken: address is not a minter");
        
        minters[minter] = false;
        dailyMintLimits[minter] = 0;
        
        emit MinterRemoved(minter);
    }
    
    /**
     * @dev Update daily mint limit for a minter
     */
    function updateDailyLimit(address minter, uint256 newLimit) external onlyOwner {
        require(minters[minter], "SolanaPayToken: address is not a minter");
        require(newLimit > 0, "SolanaPayToken: daily limit must be positive");
        
        dailyMintLimits[minter] = newLimit;
        
        emit DailyLimitUpdated(minter, newLimit);
    }
    
    /**
     * @dev Mint tokens with daily limit check
     */
    function mint(address to, uint256 amount) external onlyMinter nonReentrant {
        require(to != address(0), "SolanaPayToken: mint to zero address");
        require(amount > 0, "SolanaPayToken: amount must be positive");
        require(totalSupply() + amount <= MAX_SUPPLY, "SolanaPayToken: exceeds max supply");
        
        uint256 currentDay = block.timestamp / 1 days;
        
        // Reset daily counter if it's a new day
        if (lastMintDay[msg.sender] < currentDay) {
            dailyMinted[msg.sender] = 0;
            lastMintDay[msg.sender] = currentDay;
        }
        
        require(
            dailyMinted[msg.sender] + amount <= dailyMintLimits[msg.sender],
            "SolanaPayToken: exceeds daily mint limit"
        );
        
        dailyMinted[msg.sender] += amount;
        _mint(to, amount);
    }
    
    /**
     * @dev Pause token transfers (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get remaining daily mint allowance for a minter
     */
    function getRemainingDailyMint(address minter) external view returns (uint256) {
        if (!minters[minter]) return 0;
        
        uint256 currentDay = block.timestamp / 1 days;
        
        if (lastMintDay[minter] < currentDay) {
            return dailyMintLimits[minter];
        }
        
        return dailyMintLimits[minter] - dailyMinted[minter];
    }
    
    // Override required by Solidity
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
