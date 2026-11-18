# Tính năng mở rộng lô 3 (Tính năng 51–130)

Batch phát triển sâu thứ ba: **27 contract mới**, bổ sung **80 tính năng** trải đều các mảng
xã hội, tài chính, game hoá, an toàn, thông báo/UX và quản trị. Tất cả đều có test Foundry
(`test/Extensions3.t.sol`), deploy qua `script/DeployExtensions.s.sol` và ABI xuất bằng
`script/export-abi.mjs`.

## Nhóm xã hội & cộng đồng

| # | Tính năng | Contract |
| --- | --- | --- |
| 51 | Tặng Streak Freeze cho bạn bè (trả phí thay) | `FreezeGift` |
| 52 | Tặng bảo hiểm kỳ cho bạn bè | `FreezeGift` |
| 53 | Lịch sử quà tặng on-chain (giftId tăng dần, đọc được) | `FreezeGift` |
| 54 | Hụi điện tử (ROSCA): nhóm 3–12 ngườ, mỗi kỳ một ngườ nhận pool | `SavingCircle` |
| 55 | Kỷ luật hụi: đóng muộn trả phí 10%, bỏ đóng mất lượt | `SavingCircle` |
| 56 | Vòng hụi tự tái lập sau khi giải ngân vòng cuối | `SavingCircle` |
| 57 | Gắn mentor một lần duy nhất (mentor phải đã kích hoạt) | `MentorHub` |
| 58 | Thưởng mentor khi mentee đạt streak mốc 4/8/12/26 | `MentorHub` |
| 59 | Hồ sơ mentor: số mentee, hạng Bronze→Platinum | `MentorHub` |
| 60 | Quỹ mừng milestone chung (ai cũng góp) | `CelebrationPool` |
| 61 | Trả thưởng theo mốc streak 5/10/20, mỗi mốc một lần | `CelebrationPool` |
| 62 | Tip vào quỹ kèm lờ chúc (feed hiển thị) | `CelebrationPool` |
| 63 | Hộp thư on-chain giữa các ví | `Web3Mail` |
| 64 | Gửi thư kèm tip mUSDC | `Web3Mail` |
| 65 | Lọc hộp thư theo topic (`group:1`, `mentor`…) | `Web3Mail` |
| 66 | Bang hội chiến theo mùa | `GuildWars` |
| 67 | Điểm bang tự đồng bộ từ kết quả vault (sync pull) | `GuildWars` |
| 68 | Thưởng mùa cho bang thắng, chia theo thành viên | `GuildWars` |

## Nhóm tài chính & yield

| # | Tính năng | Contract |
| --- | --- | --- |
| 69 | Xổ số không mất tiền (gốc vẫn an toàn trong vault) | `PrizeLinkedSavings` |
| 70 | Vé số đổi từ yield đã được chia (1 mUSDC yield = 1 vé) | `PrizeLinkedSavings` |
| 71 | Jackpot tích lũy kỳ sau nếu chủ động để dành | `PrizeLinkedSavings` |
| 72 | Trái phiếu tiết kiệm kỳ hạn 2–52 kỳ | `SavingsBond` |
| 73 | Coupon tốt hơn cho ngườ có streak cao lúc phát hành | `SavingsBond` |
| 74 | Chuyển nhượng bond trước đáo hạn | `SavingsBond` |
| 75 | Chia khoản thu nhập theo tỷ lệ (vault + ví khác) | `PaycheckSplitter` |
| 76 | Lịch chia theo kỳ: gọi `execute()` một lần mỗi kỳ | `PaycheckSplitter` |
| 77 | Đổi tỷ lệ có hiệu lực từ kỳ kế tiếp (checkpoint) | `PaycheckSplitter` |
| 78 | Khóa gốc N kỳ đổi thưởng khóa | `TermLock` |
| 79 | Rút trước hạn bị phạt, thưởng trả lại pool | `TermLock` |
| 80 | Chứng nhận khóa bằng sự kiện `LockCreated/LockReleased` | `TermLock` |
| 111 | Điểm tín dụng nội bộ theo streak | `VaultCredit` |
| 112 | Hạn mức tín dụng = streak × mức mỗi streak | `VaultCredit` |
| 113 | Trả nợ linh hoạt từ ví (khấu trừ sau claim) | `VaultCredit` |

## Nhóm game hoá

| # | Tính năng | Contract |
| --- | --- | --- |
| 81 | Dự đoán ngân sách yield kỳ kế tiếp (over/under) | `PredictionBox` |
| 82 | Ngườ đoán đúng chia pool cược ngườ sai trừ phí | `PredictionBox` |
| 83 | Market không ai thắng: pool giữ lại kỳ sau | `PredictionBox` |
| 84 | Điểm danh mỗi ngày nhận Gems (ranh giới 00:00 UTC) | `DailyCheckIn` |
| 85 | Chuỗi điểm danh thưởng tăng dần (+5%/ngày, tối đa ×2) | `DailyCheckIn` |
| 86 | Bỏ ngày reset chuỗi điểm danh (không đụng streak tiết kiệm) | `DailyCheckIn` |
| 87 | Thú cưng đồng hành (adopt miễn phí, 1 con/ví) | `PetCompanion` |
| 88 | Pet lên cấp theo streak chủ + lượt cho ăn | `PetCompanion` |
| 89 | Cho pet ăn bằng Gems | `PetCompanion` |
| 90 | Ngôi vị Vua tiết kiệm: stake vượt ngườ đưng đầu + margin | `KingOfTheHill` |
| 91 | Vua của kỳ nhận % pool giải khi chốt kỳ | `KingOfTheHill` |
| 92 | Thưởng lật đổ ngôi vua | `KingOfTheHill` |
| 108 | Tem kỷ niệm mỗi kỳ đạt mục tiêu (ERC-1155) | `StampsCollection` |
| 109 | Bộ tem theo mùa (12 kỳ/mùa) | `StampsCollection` |
| 110 | Thưởng đủ bộ tem một mùa | `StampsCollection` |

## Nhóm an toàn & kỷ luật

| # | Tính năng | Contract |
| --- | --- | --- |
| 93 | Gửi tiền + thư cho tương lai, mở sau N kỳ | `TimeCapsule` |
| 94 | Capsule có id riêng làm kỷ vật số | `TimeCapsule` |
| 95 | Huỷ capsule trước hạn, hoàn gốc trừ phí | `TimeCapsule` |
| 96 | Đăng ký 2–3 guardian khôi phục | `GuardianRecovery` |
| 97 | Yêu cầu recovery sang ví mới | `GuardianRecovery` |
| 98 | Đủ 2/3 guardian xác nhận thì hoàn tất recovery | `GuardianRecovery` |
| 105 | Rút khẩn có trễ (chống xúc động) | `EmergencyHatch` |
| 106 | Huỷ lệnh rút trong thờ gian chờ | `EmergencyHatch` |
| 107 | Báo động on-chain cho watcher/guardian | `EmergencyHatch` |
| 129 | Tự giới hạn rút mỗi kỳ | `SpendingLimit` |
| 130 | Nới hạn mức có trễ vài kỳ | `SpendingLimit` |

## Nhóm quản trị & tokenomics

| # | Tính năng | Contract |
| --- | --- | --- |
| 99 | Stake Gems nhận trọng số biểu quyết | `GemStaking` |
| 100 | Đề xuất + bỏ phiếu tham số theo trọng số stake | `GemStaking` |
| 101 | Thưởng staking Gems theo epoch | `GemStaking` |
| 102 | Chia doanh thu (phí) cho staker Gems | `TreasuryDividend` |
| 103 | Cổ tức claim theo kỳ, không mất nếu claim muộn | `TreasuryDividend` |
| 104 | Tỷ lệ cổ tức theo snapshot stake đầu kỳ | `TreasuryDividend` |
| 123 | Hoàn phí theo streak | `FeeRebate` |
| 124 | Cấp rebate định kỳ mỗi N kỳ | `FeeRebate` |
| 125 | Rebate nhận mUSDC hoặc quy đổi Gems | `FeeRebate` |
| 126 | Quyên góp % yield cho thiện nguyện | `CharityPot` |
| 127 | Danh sách tổ chức do owner duyệt | `CharityPot` |
| 128 | Chứng nhận đóng góp (đếm + event công khai) | `CharityPot` |

## Nhóm UX & onboarding

| # | Tính năng | Contract |
| --- | --- | --- |
| 114 | Mẫu mục tiêu có sẵn (du lịch, học phí…) áp ngay vào vault | `GoalTemplates` |
| 115 | Theo dõi % tiến độ theo mẫu | `GoalTemplates` |
| 116 | Hoa hồng Gems cho tác giả mẫu được dùng | `GoalTemplates` |
| 117 | Faucet mUSDC cho ví mới (tự đặt mục tiêu đầu) | `FaucetDrip` |
| 118 | Giới hạn 1 lần duy nhất mỗi ví | `FaucetDrip` |
| 119 | Cap tổng drip mỗi kỳ, chống cày | `FaucetDrip` |
| 120 | Nhật ký cảm xúc theo kỳ | `SavingsJournal` |
| 121 | Nhật ký công khai / riêng tư | `SavingsJournal` |
| 122 | Lờ nhắn từ quá khứ khi sang kỳ mới | `SavingsJournal` |

## Sửa lỗi cốt lõi kèm theo

- `BatchHelper.batchDepositWithTarget` trước đây **bỏ qua tham số `target`** (cảnh báo
  compiler + hàm không làm đúng mô tả). Đã thêm cơ chế **operator** vào `StreakVault`
  (`setOperator` + `setWeeklyTargetFor`) để batch đặt mục tiêu hộ an toàn, chống griefing.
- `StreakVault.frozenUntilEpoch` lưu nguyên epoch khiến **kỳ 0 bị lỗi kép**: không freeze
  được (0 >= 0) và mọi ví đều bị coi như đã freeze lúc chốt kỳ 0. Đã đổi sang nghĩa
  `epoch + 1` (0 = chưa từng freeze) ở `freezeCurrentEpoch`, `freezeFor` và `_settleWallet`.
- `SavingCircle.contribute` đổi sang đóng cho **vòng đang chờ giải ngân** (trước đây hết
  kỳ vẫn ghi nhầm vào vòng mới, làm phí đóng muộn vô nghĩa).
- `KingOfTheHill.claimThrone` chỉ trả thưởng lật đổ khi **thực sự lật đổ** (trước đây ngườ
  lên ngôi đầu tiên cũng nhận thưởng).
- `GuildWars.sync()` không còn revert khi không có kỳ mới (cho phép `endSeason` bất kỳ lúc nào).
