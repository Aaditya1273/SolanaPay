export type AssetConverter = {
  "version": "0.1.0",
  "name": "asset_converter",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "converterState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "conversionFeeRate",
          "type": "u64"
        },
        {
          "name": "admin",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "addConversionPair",
      "accounts": [
        {
          "name": "converterState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "conversionPair",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sourceMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "targetMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "sourceMint",
          "type": "publicKey"
        },
        {
          "name": "targetMint",
          "type": "publicKey"
        },
        {
          "name": "conversionRate",
          "type": "u64"
        },
        {
          "name": "minAmount",
          "type": "u64"
        },
        {
          "name": "maxAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "convertAsset",
      "accounts": [
        {
          "name": "converterState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "conversionPair",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sourceMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "targetMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userSourceAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userTargetAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sourceVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "targetVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "adminFeeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "converterState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "conversionFeeRate",
            "type": "u64"
          },
          {
            "name": "totalConversions",
            "type": "u64"
          },
          {
            "name": "totalVolume",
            "type": "u64"
          },
          {
            "name": "isPaused",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "conversionPair",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sourceMint",
            "type": "publicKey"
          },
          {
            "name": "targetMint",
            "type": "publicKey"
          },
          {
            "name": "conversionRate",
            "type": "u64"
          },
          {
            "name": "minAmount",
            "type": "u64"
          },
          {
            "name": "maxAmount",
            "type": "u64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "totalConverted",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "AssetConvertedEvent",
      "fields": [
        {
          "name": "user",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "sourceMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "targetMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "sourceAmount",
          "type": "u64",
          "index": false
        },
        {
          "name": "targetAmount",
          "type": "u64",
          "index": false
        },
        {
          "name": "feeAmount",
          "type": "u64",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "ProgramPaused",
      "msg": "The conversion program is currently paused"
    },
    {
      "code": 6001,
      "name": "ConversionPairInactive",
      "msg": "The conversion pair is not active"
    },
    {
      "code": 6002,
      "name": "AmountTooSmall",
      "msg": "Amount is below minimum threshold"
    },
    {
      "code": 6003,
      "name": "AmountTooLarge",
      "msg": "Amount exceeds maximum threshold"
    }
  ]
}
