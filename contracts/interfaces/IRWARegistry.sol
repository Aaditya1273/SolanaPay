// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRWARegistry {
    enum AssetType { 
        REAL_ESTATE, 
        CARBON_CREDITS, 
        COMMODITIES, 
        PRECIOUS_METALS, 
        BONDS, 
        STOCKS,
        INTELLECTUAL_PROPERTY,
        RENEWABLE_ENERGY
    }

    enum AssetStatus { 
        PENDING, 
        VERIFIED, 
        ACTIVE, 
        SUSPENDED, 
        DEPRECATED 
    }

    enum ComplianceLevel { 
        BASIC, 
        KYC_VERIFIED, 
        ACCREDITED_INVESTOR, 
        INSTITUTIONAL 
    }

    struct RWAAsset {
        uint256 assetId;
        AssetType assetType;
        AssetStatus status;
        ComplianceLevel requiredCompliance;
        address tokenContract;
        uint256 chainId;
        string metadataURI;
        address verifier;
        uint256 verificationTimestamp;
        uint256 totalValue;
        uint256 totalSupply;
        bool isFractionalized;
        address fractionalContract;
    }

    function getAsset(uint256 assetId) external view returns (RWAAsset memory);
    function getNextAssetId() external view returns (uint256);
    function isAssetOperator(uint256 assetId, address operator) external view returns (bool);
    function userCompliance(address user) external view returns (ComplianceLevel);
    function registerAsset(
        AssetType assetType,
        address tokenContract,
        uint256 chainId,
        string memory metadataURI,
        uint256 totalValue,
        uint256 totalSupply,
        ComplianceLevel requiredCompliance
    ) external returns (uint256);
}
