#!/usr/bin/env bash
# Kịch bản demo trên Fuji: An, Bình, Chi (README mục 6).
set -euo pipefail

export PATH="$HOME/.foundry/bin:$PATH"

RPC=${RPC:-https://api.avax-test.network/ext/bc/C/rpc}
TOKEN=0x0db5cdD119083C36c03a3BC62601bb5779E40044
VAULT=0x1Aba9260d4d02AEe46654CBA0cDE773dfAB8AB14
DIST=0xc72B87F9F80AeFba2Eda2793F35C7BBD6Fa55B24

AN=0xF9B488fb36345243Ba734737abA2c2a0d2463908
AN_PK=0x73b0feea5e50f4c4e3eb052538c5c71a3f4b1cea8fd877bb9d74d9ee1fc63871
BINH=0xC6aF847E94Bf2201cE12701F8Ec6861d99C3E929
BINH_PK=0x27f62c48a5c5e0c4d0c71a7d2cb1a046c0b9628ccef4389872c0bf5b2850551d
CHI=0xBF3746DAcd217110Dc8b349169d6D8a36a5147E4
CHI_PK=0x73f20c53809faa0ed71af21a7220a81d073d7f28e51539f8f9b66d2aaf530f2b

FIVE=5000000
ONE=1000000

send() { # send <pk> <to> <sig> [args...]
  local pk=$1 to=$2 sig=$3; shift 3
  cast send --rpc-url "$RPC" --private-key "$pk" "$to" "$sig" "$@" 2>&1 | grep -E "transactionHash|status" | tr '\n' ' '
  echo
}

echo "== approve vault (max) cho 3 ví =="
send "$AN_PK"   $TOKEN "approve(address,uint256)" $VAULT $(cast max-uint)
send "$BINH_PK" $TOKEN "approve(address,uint256)" $VAULT $(cast max-uint)
send "$CHI_PK"  $TOKEN "approve(address,uint256)" $VAULT $(cast max-uint)

START=$(cast call $VAULT "startAt()(uint256)" --rpc-url "$RPC" | head -1)
DUR=$(cast call $VAULT "epochDuration()(uint256)" --rpc-url "$RPC" | head -1)
echo "startAt=$START duration=$DUR"
NOW=$(date +%s)
if (( NOW < START )); then
  echo "chờ $((START - NOW))s đến khi kỳ 0 mở..."
  sleep $((START - NOW + 5))
fi

echo "== KỲ 0: An, Bình đặt target 5, gửi 5 =="
send "$AN_PK"   $VAULT "setWeeklyTarget(uint256)" $FIVE
send "$BINH_PK" $VAULT "setWeeklyTarget(uint256)" $FIVE
send "$AN_PK"   $VAULT "deposit(uint256)" $FIVE
send "$BINH_PK" $VAULT "deposit(uint256)" $FIVE

echo "== chờ kết thúc kỳ 0 =="
E0_END=$((START + DUR))
NOW=$(date +%s)
if (( NOW < E0_END )); then sleep $((E0_END - NOW + 5)); fi

echo "== chốt kỳ 0 =="
send "$AN_PK" $DIST "finalizeEpoch(uint256)" 0

echo "-- streak sau kỳ 0 (An, Bình, Chi):"
for w in $AN $BINH $CHI; do
  cast call $VAULT "getAccount(address)((uint256,uint256,uint256,uint256,uint256,bool,uint256,uint256,uint256,uint256,uint256))" $w --rpc-url "$RPC" | tail -1 | awk -F',' '{print $5}'
done
echo "-- reward kỳ 0 (An, Bình, Chi):"
for w in $AN $BINH $CHI; do
  cast call $DIST "rewardOf(address,uint256)(uint256)" $w 0 --rpc-url "$RPC" | head -1
done

echo "== KỲ 1: An gửi 5, Bình bỏ, Chi đặt target 5 + gửi 5 =="
send "$AN_PK"  $VAULT "deposit(uint256)" $FIVE
send "$CHI_PK" $VAULT "setWeeklyTarget(uint256)" $FIVE
send "$CHI_PK" $VAULT "deposit(uint256)" $FIVE

echo "== chờ kết thúc kỳ 1 =="
E1_END=$((START + 2 * DUR))
NOW=$(date +%s)
if (( NOW < E1_END )); then sleep $((E1_END - NOW + 5)); fi

echo "== chốt kỳ 1 =="
send "$AN_PK" $DIST "finalizeEpoch(uint256)" 1

echo "-- streak sau kỳ 1 (An, Bình, Chi):"
for w in $AN $BINH $CHI; do
  cast call $VAULT "getAccount(address)((uint256,uint256,uint256,uint256,uint256,bool,uint256,uint256,uint256,uint256,uint256))" $w --rpc-url "$RPC" | tail -1 | awk -F',' '{print $5}'
done
echo "-- reward kỳ 1 (An, Bình, Chi):"
for w in $AN $BINH $CHI; do
  cast call $DIST "rewardOf(address,uint256)(uint256)" $w 1 --rpc-url "$RPC" | head -1
done

echo "== sau kỳ 1: Bình rút 5 gốc + claim; An claim =="
send "$BINH_PK" $VAULT "withdraw(uint256)" $FIVE
send "$BINH_PK" $DIST "claimYield()"
send "$AN_PK"   $DIST "claimYield()"

echo "-- claimedYield (An, Bình):"
cast call $DIST "claimedYield(address)(uint256)" $AN --rpc-url "$RPC" | head -1
cast call $DIST "claimedYield(address)(uint256)" $BINH --rpc-url "$RPC" | head -1

echo "-- số dư cuối (An, Bình, Chi) mUSDC:"
for w in $AN $BINH $CHI; do
  cast call $TOKEN "balanceOf(address)(uint256)" $w --rpc-url "$RPC" | head -1
done

echo "== DEMO HOÀN TẤT =="
