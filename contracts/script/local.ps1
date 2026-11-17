# Chạy local trên Anvil: deploy + seed 3 ví demo (An, Bình, Chi = account #1..#3 của Anvil).
# Dùng: mở terminal khác chạy `anvil`, rồi tại contracts/: .\script\local.ps1
# Tham số: -EpochSeconds 180 -StartDelaySeconds 0
param(
    [int]$EpochSeconds = 180,
    [int]$StartDelaySeconds = 0,
    [string]$RpcUrl = "http://127.0.0.1:8545"
)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

# Private key mặc định của Anvil account #0 (CHỈ DÙNG LOCAL, công khai trong tài liệu Foundry).
$AnvilKey0 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
$env:EPOCH_SECONDS = "$EpochSeconds"
$env:START_DELAY_SECONDS = "$StartDelaySeconds"
$env:DEMO_WALLETS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8,0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,0x90F79bf6EB2c4f870365E785982E1f101E93b906"

forge script script/Deploy.s.sol:Deploy --rpc-url $RpcUrl --private-key $AnvilKey0 --broadcast
if ($LASTEXITCODE -ne 0) { throw "Deploy failed" }
forge script script/Seed.s.sol:Seed --rpc-url $RpcUrl --private-key $AnvilKey0 --broadcast
if ($LASTEXITCODE -ne 0) { throw "Seed failed" }
node script/export-abi.mjs
Write-Host "Done. Addresses: deployments/31337.json, ABI: abi/"
