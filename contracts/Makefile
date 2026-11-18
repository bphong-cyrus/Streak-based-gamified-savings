.PHONY: build test test-gas fmt export-abi anvil-local deploy-local seed-local deploy-fuji seed-fuji

build:
	forge build

test:
	forge test -vvv

test-gas:
	forge test --gas-report

fmt:
	forge fmt

export-abi:
	node script/export-abi.mjs

# ------------------------------------------------------------------
# Local Anvil (chain 31337)
# ------------------------------------------------------------------
anvil-local:
	anvil

deploy-local:
	forge script script/Deploy.s.sol:Deploy \
	  --rpc-url http://127.0.0.1:8545 \
	  --broadcast

seed-local:
	forge script script/Seed.s.sol:Seed \
	  --rpc-url http://127.0.0.1:8545 \
	  --broadcast

# ------------------------------------------------------------------
# Avalanche Fuji (chain 43113)
# Requires: cast wallet import fuji-deployer --interactive
#           source .env (DEPLOYER_ADDRESS, FUJI_RPC_URL, EPOCH_SECONDS...)
# ------------------------------------------------------------------
deploy-fuji:
	forge script script/Deploy.s.sol:Deploy \
	  --rpc-url $(FUJI_RPC_URL) \
	  --account fuji-deployer \
	  --sender $(DEPLOYER_ADDRESS) \
	  --broadcast

seed-fuji:
	forge script script/Seed.s.sol:Seed \
	  --rpc-url $(FUJI_RPC_URL) \
	  --account fuji-deployer \
	  --sender $(DEPLOYER_ADDRESS) \
	  --broadcast
