#!/usr/bin/env bash
# Deploy bản contract MỚI lên Avalanche Fuji + seed ngân sách cho ví demo A/B — TẤT CẢ TRONG 1 LỆNH.
#
# CÁCH CHẠY (Git Bash / bash):
#   cd contracts
#   PRIVATE_KEY=0x... DEMO_A=0x... DEMO_B=0x... bash script/deploy-fuji.sh
#
# Trong đó:
#   PRIVATE_KEY  private key ví deployer (ví 0xBc4c... đã deploy bản cũ)
#   DEMO_A       địa chỉ ví ngườ dùng demo A
#   DEMO_B       địa chỉ ví ngườ dùng demo B
#
# Script tự: kiểm tra gas → deploy 8 contract (kỳ 180 giây, mở kỳ sau 60 giây)
# → seed fund theo KỲ HIỆN TẠI + mint 100 mUSDC cho A/B → in địa chỉ mới.
# Xong thì cập nhật Vercel env theo docs/HUONG_DAN_TEST_FUJI.md mục 3.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${PRIVATE_KEY:?Thiếu PRIVATE_KEY — đặt PRIVATE_KEY=0x... (ví deployer)}"
: "${DEMO_A:?Thiếu DEMO_A — đặt DEMO_A=0x... (ví demo A)}"
: "${DEMO_B:?Thiếu DEMO_B — đặt DEMO_B=0x... (ví demo B)}"

RPC="${FUJI_RPC:-https://api.avax-test.network/ext/bc/C/rpc}"
DEPLOYER="$(cast wallet address --private-key "$PRIVATE_KEY")"

echo "== Địa chỉ deployer: $DEPLOYER"
BAL="$(cast balance "$DEPLOYER" --rpc-url "$RPC")"
echo "== Số dư AVAX: $BAL"
echo "   (cần ~0.15 AVAX; nếu thiếu, xin thêm ở https://core.app/tools/testnet-faucet/)"

echo ""
echo "== BƯỚC 1/2: Deploy 8 contract (kỳ 180 giây)..."
EPOCH_SECONDS=180 START_DELAY_SECONDS=60 \
  forge script script/Deploy.s.sol --rpc-url "$RPC" --broadcast --private-key "$PRIVATE_KEY" -vvvv

echo ""
echo "== BƯỚC 2/2: Seed — mint 100 mUSDC cho A/B + fund yield 3 kỳ liên tiếp + pool điểm danh + faucet..."
DEMO_WALLETS="$DEMO_A,$DEMO_B" \
  forge script script/Seed.s.sol --rpc-url "$RPC" --broadcast --private-key "$PRIVATE_KEY" -vvvv

echo ""
echo "============================================================"
echo "XONG! Địa chỉ mới (đã ghi vào deployments/43113.json):"
cat deployments/43113.json
echo ""
echo "Tiếp theo: cập nhật 8 biến môi trường trên Vercel theo mục 3 của"
echo "docs/HUONG_DAN_TEST_FUJI.md rồi Redeploy. Đợi kỳ đầu mở (60 giây) là test được."
