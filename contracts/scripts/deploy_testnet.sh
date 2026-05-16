#!/usr/bin/env bash
# Deploy all CERCLE contracts to Stellar testnet
set -euo pipefail

NETWORK="testnet"
RPC_URL="${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"
PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
ADMIN_KEY="${ADMIN_SECRET_KEY:?ADMIN_SECRET_KEY required}"

WASM_DIR="./target/wasm32-unknown-unknown/release"

echo "==> Building contracts..."
cargo build --target wasm32-unknown-unknown --release

deploy() {
  local name=$1
  local wasm="$WASM_DIR/${name}.wasm"
  echo "==> Deploying $name..."
  stellar contract deploy \
    --wasm "$wasm" \
    --source "$ADMIN_KEY" \
    --network "$NETWORK" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE"
}

FACTORY_ID=$(deploy "cercle_factory")
REPUTATION_ID=$(deploy "reputation_registry")
INSURANCE_ID=$(deploy "insurance_vault")
POOL_ID=$(deploy "rotational_pool")

echo ""
echo "==> Deployed contract IDs:"
echo "FACTORY_CONTRACT_ID=$FACTORY_ID"
echo "REPUTATION_CONTRACT_ID=$REPUTATION_ID"
echo "INSURANCE_CONTRACT_ID=$INSURANCE_ID"
echo "POOL_CONTRACT_ID=$POOL_ID"

# Write to .env if present
if [ -f "../../.env" ]; then
  sed -i "s/^FACTORY_CONTRACT_ID=.*/FACTORY_CONTRACT_ID=$FACTORY_ID/" ../../.env
  sed -i "s/^REPUTATION_CONTRACT_ID=.*/REPUTATION_CONTRACT_ID=$REPUTATION_ID/" ../../.env
  sed -i "s/^INSURANCE_CONTRACT_ID=.*/INSURANCE_CONTRACT_ID=$INSURANCE_ID/" ../../.env
  echo "==> Updated .env"
fi
