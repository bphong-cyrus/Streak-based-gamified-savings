// AUTO-GENERATED bởi contracts/script/export-abi.mjs. Không sửa tay.

export const mockUSDCAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "admin",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "DEFAULT_ADMIN_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MINTER_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "getRoleAdmin",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "grantRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "hasRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "mint",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "renounceRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "callerConfirmation",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "revokeRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "supportsInterface",
    "inputs": [
      {
        "name": "interfaceId",
        "type": "bytes4",
        "internalType": "bytes4"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalSupply",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transfer",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferFrom",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Approval",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "spender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleAdminChanged",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "previousAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "newAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleGranted",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleRevoked",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Transfer",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AccessControlBadConfirmation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AccessControlUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "neededRole",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InsufficientAllowance",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "allowance",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "needed",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InsufficientBalance",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "balance",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "needed",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidApprover",
    "inputs": [
      {
        "name": "approver",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidReceiver",
    "inputs": [
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidSender",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidSpender",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      }
    ]
  }
] as const;

export const streakVaultAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "token_",
        "type": "address",
        "internalType": "contract IERC20"
      },
      {
        "name": "startAt_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "epochDuration_",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "MAX_PARTICIPANTS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "currentEpoch",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "deposit",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "distributor",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "epochDuration",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "epochEnd",
    "inputs": [
      {
        "name": "epoch",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "epochStart",
    "inputs": [
      {
        "name": "epoch",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAccount",
    "inputs": [
      {
        "name": "wallet",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "v",
        "type": "tuple",
        "internalType": "struct IStreakVault.AccountView",
        "components": [
          {
            "name": "principal",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "currentTarget",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "pendingTarget",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "pendingTargetEpoch",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "streak",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "activated",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "activationEpoch",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "currentEpoch",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "currentDeposited",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "currentWithdrawn",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "currentProgress",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEpochStatus",
    "inputs": [
      {
        "name": "wallet",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "epoch",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "s",
        "type": "tuple",
        "internalType": "struct IStreakVault.EpochStatus",
        "components": [
          {
            "name": "target",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "deposited",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "withdrawn",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "progress",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "settled",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "qualified",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "streakAtSettle",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getParticipants",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTargetCheckpoints",
    "inputs": [
      {
        "name": "wallet",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct StreakVault.TargetCheckpoint[]",
        "components": [
          {
            "name": "fromEpoch",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "amount",
            "type": "uint192",
            "internalType": "uint192"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasStarted",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "initializer",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextEpochToSettle",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "participantCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setDistributor",
    "inputs": [
      {
        "name": "distributor_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setWeeklyTarget",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "settleEpoch",
    "inputs": [
      {
        "name": "epoch",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "wallets",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "weights",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "totalWeight",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "startAt",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "targetAt",
    "inputs": [
      {
        "name": "wallet",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "epoch",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "token",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalPrincipal",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "AccountEpochSettled",
    "inputs": [
      {
        "name": "wallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "epoch",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "qualified",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "streak",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Deposited",
    "inputs": [
      {
        "name": "wallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "epoch",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newPrincipal",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DistributorSet",
    "inputs": [
      {
        "name": "distributor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TargetScheduled",
    "inputs": [
      {
        "name": "wallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "effectiveEpoch",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Withdrawn",
    "inputs": [
      {
        "name": "wallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "epoch",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newPrincipal",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "DistributorAlreadySet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EpochNotEnded",
    "inputs": [
      {
        "name": "epoch",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "endsAt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "EpochOutOfOrder",
    "inputs": [
      {
        "name": "expected",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "got",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InsufficientPrincipal",
    "inputs": [
      {
        "name": "requested",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "available",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "MaxParticipantsReached",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotDistributor",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotInitializer",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotStarted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeCastOverflowedUintDowncast",
    "inputs": [
      {
        "name": "bits",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAmount",
    "inputs": []
  }
] as const;

export const mockYieldSourceAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "token_",
        "type": "address",
        "internalType": "contract IERC20"
      },
      {
        "name": "vault_",
        "type": "address",
        "internalType": "contract IStreakVault"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "budgetOf",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "distributor",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "fundEpoch",
    "inputs": [
      {
        "name": "epoch",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "initializer",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "release",
    "inputs": [
      {
        "name": "epoch",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "released",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setDistributor",
    "inputs": [
      {
        "name": "distributor_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "token",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "vault",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IStreakVault"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "DistributorSet",
    "inputs": [
      {
        "name": "distributor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EpochFunded",
    "inputs": [
      {
        "name": "epoch",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "funder",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newBudget",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EpochReleased",
    "inputs": [
      {
        "name": "epoch",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyReleased",
    "inputs": [
      {
        "name": "epoch",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "DistributorAlreadySet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FundingClosed",
    "inputs": [
      {
        "name": "epoch",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "endsAt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotDistributor",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotInitializer",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAmount",
    "inputs": []
  }
] as const;

export const yieldDistributorAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "token_",
        "type": "address",
        "internalType": "contract IERC20"
      },
      {
        "name": "vault_",
        "type": "address",
        "internalType": "contract IStreakVault"
      },
      {
        "name": "yieldSource_",
        "type": "address",
        "internalType": "contract IMockYieldSource"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "canFinalize",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claimYield",
    "inputs": [],
    "outputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimableYield",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claimedYield",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "finalizeEpoch",
    "inputs": [
      {
        "name": "epoch",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getEpochSummary",
    "inputs": [
      {
        "name": "epoch",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct YieldDistributor.EpochSummary",
        "components": [
          {
            "name": "finalized",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "funded",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "rolloverIn",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "budget",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "totalWeight",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "distributed",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "rolloverOut",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextEpochToFinalize",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "rewardOf",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "rollover",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "token",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalClaimable",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "vault",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IStreakVault"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "yieldSource",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IMockYieldSource"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "EpochFinalized",
    "inputs": [
      {
        "name": "epoch",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "budget",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "totalWeight",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "distributed",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "rolloverOut",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "caller",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RewardAllocated",
    "inputs": [
      {
        "name": "wallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "epoch",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "YieldClaimed",
    "inputs": [
      {
        "name": "wallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "EpochNotEnded",
    "inputs": [
      {
        "name": "epoch",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "endsAt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "EpochOutOfOrder",
    "inputs": [
      {
        "name": "expected",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "got",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NothingToClaim",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  }
] as const;

export const deployments = {
  "31337": {
    "chainId": 31337,
    "deployBlock": 0,
    "deployer": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "distributor": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    "epochSeconds": 180,
    "startAt": 1794932495,
    "token": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "vault": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "yieldSource": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  }
} as const;
