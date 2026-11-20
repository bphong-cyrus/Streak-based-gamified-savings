# Kịch bản demo Savient — quay video 3–5 phút

Mục tiêu: một video duy nhất kể trọn câu chuyện **vấn đề → giải pháp → giao dịch thật → vì sao Avalanche**,
có thể phát trực tiếp ở vòng pitching hoặc để giám khảo xem lại. Quay màn hình 1080p+, tiếng nói rõ,
bật hiển thị chuột. Quay trước giờ pitch ít nhất nửa ngày để kịp re-upload nếu lỗi.

**Chuẩn bị trước khi bấm quay:**
- Máy đã cài ví Core (hoặc MetaMask) với 2 ví demo: **Demo A** (có ~0.5 AVAX + 100 mUSDC) và **Demo B**
  (nếu đã dùng hết thì xin thêm ở faucet — hướng dẫn trong docs/HUONG_DAN_TEST_FUJI.md).
- Mở sẵn 2 tab: app https://cozy-save.vercel.app và Snowtrace https://testnet.snowtrace.io.
- Mở sẵn README của repo ở mục "Bằng chứng giao dịch thật" (để chiếu bảng tx hash khi cần).
- Đồng hồ kỳ là 180 giây: toàn bộ lượt demo quay = **1 kỳ rưỡi ≈ 5 phút**; nếu ví đã có gốc từ trước,
  cắt bỏ bước nạp, còn ~3 phút.

---

## SHOT 1 — Mở đầu (30 giây) · *nói trên nền app ở chế độ Bản thử*

Mở app **có `?demo=1`** trên URL. Trỏ chuột vào:
- Nhãn **"Bản thử — không phải số dư thật"** và dải thông báo mô phỏng.
- Tòa nhà 3D với mèo cư dân: "Mỗi kỳ gửi đủ mục tiêu, tòa nhà mọc một tầng — streak càng dài, phần thưởng càng lớn."

> **Lồng tiếng gợi ý:** *"Ngườ trẻ không thiếu tiền — thiếu kỷ luật để gửi đều. Savient biến thói quen tiết kiệm thành trò chơi: gửi đủ mỗi kỳ, tòa nhà của bạn mọc thêm tầng, streak tăng, thưởng tăng. Bỏ một kỳ — streak về 0."*

## SHOT 2 — Cam kết cốt lõi (20 giây) · *tab Hồ sơ → "Thông tin trên chuỗi"*

Chỉ vào danh sách địa chỉ contract + dòng "không server nào giữ tiền ngườ dùng".
Bấm mở 1 link Snowtrace sang tab contract.

> *"Tiền không nằm ở server chúng tôi — nằm trong hợp đồng StreakVault trên Avalanche Fuji, mã nguồn mở, đối chiếu được từng giao dịch. Và quan trọng nhất: rút gốc luôn đủ 100% — phí trên gốc đã được gỡ hoàn toàn khỏi code, không ai bật lại được."*

## SHOT 3 — Giao dịch thật với ví A (90 giây, có cắt bỏ đoạn chờ) · *bỏ `?demo=1`, kết nối ví*

1. Kết nối **Demo A** → app tự chuyển sang Fuji.
2. Tab **Nhà** → bấm **"Nhận 5 mUSDC miễn phí & bắt đầu"** → ký → chỉ link Snowtrace trên app:
   *"Onboarding một chạm: 5 mUSDC chạy thẳng vào vault, mục tiêu đầu được đặt sẵn — một giao dịch duy nhất."*
3. Tab **Nhà** → bấm nút xanh gửi tiền → ký **approve** → ký **deposit** → số "Gốc đã gửi" nhảy lên 5, tầng nhà đang xây:
   *"Approve rồi deposit — hai chữ ký, tiền vào hợp đồng, tiến độ kỳ chạy ngay."*
4. **CẮT**: đợi đồng hồ kỳ về 0 (quay nhanh/tua: đồng hồ đếm ngược 180 giây).
5. Kỳ kết thúc → tab **Thưởng** → **"Chốt kỳ"** → ký:
   *"Chốt kỳ là hành động công khai — ai gọi cũng được, không cần xin phép admin."*
6. **"Nhận lãi về ví"** → ký → số "Lãi tích lũy" tăng:
   *"Ngân sách kỳ được chia theo trọng số streak — minh bạch trong hợp đồng, không phải con số server tự tính."*
7. **"Rút gốc"** → ký → số dư ví trong Core tăng đủ 5:
   *"Rút ngay giữa kỳ cũng được — 100% gốc, không phí, không khóa."*

## SHOT 4 — So sánh 2 streak (60 giây) · *chiếu bảng bằng chứng trong README*

Đổi sang README, mục "Bằng chứng giao dịch thật": trỏ vào 2 dòng kết quả và 2–3 tx hash.

> *"Kịch bản đã chạy thật trên Fuji với hai ví: ví A gửi đủ hai kỳ liên tiếp — streak 2, nhận 13 mUSDC lãi. Ví B gửi kỳ đầu rồi lỡ kỳ sau — streak reset về 0, thưởng kỳ sau bằng 0. Mọi giao dịch có hash trên Snowtrace, giám khảo tự bấm đối chiếu — mình không cần phải tin lờ mình."*
>
> *"Số học thật trong hợp đồng: kỳ có 18 mUSDC ngân sách thì chia đều cho streak 1:1; kỳ sau chỉ còn A giữ streak nên A nhận trọn 4 mUSDC — đúng công thức đã công bố."*

## SHOT 5 — Vì sao Avalanche + roadmap (30 giây) · *quay lại app hoặc slide đơn giản*

> *"Sản phẩm này cần giao dịch rẻ, nhanh, final ngay — Avalanche C-Chain hoàn hảo cho vòng lặp tiết kiệm theo kỳ. Fuji là testnet nên mình demo bằng mUSDC mock; mainnet roadmap là nguồn yield thật qua Aave/Benqi, audit độc lập, và timelock admin."*

## SHOT 6 — Chốt (15 giây)

> *"Savient — tiết kiệm đều mỗi kỳ, nhà mọc tầng mỗi tuần, gốc luôn là của bạn. Repo mở, hợp đồng mở, bằng chứng mở."*

---

## Checklist sau khi quay

- [ ] Nghe lại: đọc đúng tên **Savient** (Saving · Convenient · Consistent), không còn tên cũ.
- [ ] Tx hash trên màn hình (link Snowtrace trong app) phải đọc được — zoom nếu cần.
- [ ] Độ dài 3–5 phút; cắt hết đoạn chờ đồng hồ (tua nhanh).
- [ ] Xuất 1080p MP4; giữ bản gốc để cắt highlight 60 giây cho slide.
- [ ] Dự phòng: nếu lúc pitch RPC Fuji chậm, phát video này thay vì demo live — bảng tx hash trong README là bằng chứng song song.

## Nếu demo live tại sân khấu (không quay trước)

Chỉ làm 3 bước: kết nối ví → bấm **"Gửi tiền hoàn thành tầng"** (approve + deposit) → chỉ tòa nhà mọc tầng.
Nói câu chốt ở Shot 6. Mọi thứ khác đã có video + bảng hash dự phòng.
