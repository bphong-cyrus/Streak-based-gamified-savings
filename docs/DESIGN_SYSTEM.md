# Thiết kế UI/UX — Savient

Quy trình áp dụng: **Design Thinking** (Stanford d.school) trong khung **Double Diamond**, triết lý **UCD** (ISO 9241-210), kiểm định theo **Nielsen 10 heuristics**, tiêu chuẩn tiếp cận **WCAG 2.2 AA**, hệ thống thiết kế theo **Atomic Design + Design Tokens** (tham chiếu Material 3 & Apple HIG).

## 1. Empathize & Define

**Persona chính — "Minh, 20t, sinh viên năm 2":**
- Muốn tích lũy nhưng chi tiêu mất kiểm soát, hay "gửi rồi quên", bỏ giữa chừng sau 2–3 tuần.
- Sợ mất tiền vào nơi không rõ ràng; ngại thao tác phức tạp; dùng điện thoại là chính.
- Động lực mạnh: cảm giác "tiến bộ mỗi ngày", được bạn bè công nhận, phần thưởng nhìn thấy được.

**Pain point → thiết kế trả lờ:**

| Pain point | Giải pháp trong sản phẩm |
|---|---|
| Không giữ được nhịp gửi đều | Streak + tòa nhà 3D mọc tầng mỗi kỳ đạt mục tiêu |
| Sợ mất tiền | Gốc rút anytime, mọi tx link Snowtrace, báo cáo audit công khai |
| Thao tác phức tạp | 1 CTA chính mỗi màn hình (Hick's Law), nút cần ví thì disabled rõ ràng |
| Quên hạn chót | Countdown + nhấp nháy đỏ khi < 1h + nút "Đóng băng kỳ" |
| Cảm giác cô đơn | Nhóm bạn bè, bảng vàng, tặng freeze, mèo cưng, quỹ ăn mừng |

## 2. Ideate → Information Architecture

Điều hướng 6 tab theo tần suất & mục tiêu ngườ dùng (Jakob's Law — đúng chuẩn app di động):

```
Nhà (trạng thái + CTA chính) · Mục tiêu · Nhóm · Chơi · Tiện ích · Tôi
└─ tab phụ được thu gọn (Hick's Law): mặc định mở 1–3 section quan trọng
```

## 3. Design System (Atomic Design — tokens ở `globals.css`)

- **Atoms:** Design Tokens — màu ngữ nghĩa (`--surface`, `--ink`, `--accent`…), type scale fluid `clamp()`, spacing 4px scale, motion (`--ease-spring`, 2 mức duration), touch target tối thiểu 44px.
- **Molecules:** `Stat`, `FieldLabel`, `ActionRow`, nút `btn-cozy/btn-cream`, `input-cozy` — một nguồn duy nhất, không hardcode.
- **Organisms:** `FeatureCard` (hỗ trợ collapsible), `Tile`, `MissionsCard` — đồng bộ padding/radius/bóng.
- **Templates/Pages:** 6 tab dùng chung grid masonry (desktop) / 1 cột (mobile).

## 4. Heuristics audit (Nielsen) — trạng thái tuân thủ

| Nguyên tắc | Cách áp dụng |
|---|---|
| Visibility of system status | Skeleton shimmer khi tải; `aria-live` trên mọi tx feedback; countdown thờ gian thật |
| Match with real world | Ngôn ngữ đờii thường ("Gửi tuần này", "Rút gốc"), icon SVG minh họa đúng vật thể |
| Error prevention | Nút thiếu điều kiện thì disabled; demo mode báo "chỉ mô phỏng" thay vì lỗi ký cryptic |
| Consistency | Token hoá toàn bộ; easing duy nhất; icon set 1 phong cách nét vẽ tay |
| Recognition over recall | Tab bar nhãn + icon luôn nhìn thấy; tiến độ tuần hiện số + thanh % |
| Flexibility | Zoom nhà 3D, day/night, tắt âm thanh |
| Aesthetic & minimalist | Section phụ thu gọn; mỗi card một nhiệm vụ |

## 5. Accessibility — WCAG 2.2 AA

- **2.4.7 / 2.4.11 Focus Appearance:** vòng focus xanh `#2f7de1` 3px trên toàn bộ interactive elements (keyboard navigation).
- **2.3.3 Animation from Interactions:** `prefers-reduced-motion` tắt toàn bộ animation vô hạn.
- **2.5.8 Target Size:** nút chạm ≥ 44px (zoom, tab bar, CTA).
- **1.4.3 Contrast (AA):** chính ≥ 4.5:1 (đã audit lại night theme, tăng tone nhấn).
- **4.1.2/4.1.3 Name-Role-Value & Status Messages:** `aria-label` cho nút icon-only, `role="progressbar"` + giá trị, `aria-current="page"` tab đang chọn, dialog onboarding `role="dialog" aria-modal`, mọi thông báo tx trong vùng `role="status" aria-live="polite"`.

## 6. Laws of UX

- **Fitts's Law:** CTA chính full-width ở đáy vùng ngón tay cái; nút zoom 44px bên hông nhà.
- **Hick's Law:** ~50 tính năng chia 6 tab, tab phụ thu gọn mặc định — quyết định nhanh hơn.
- **Jakob's Law:** bottom nav, bottom sheet, card list — patterns quen thuộc.
- **Peak–End Rule:** khoảnh khắc đỉnh = màn ăn mừng (mưa vàng + fanfare + tòa nhà nhảy tầng); kết thúc = banner "TẦNG MỚI HOÀN THÀNH" + streak +1.

## 7. Perceived performance

- Skeleton shimmer thay số 0/"—" khi dữ liệu đang tải.
- Scene 3D lazy-load kèm splash mèo nhảy; three.js tách chunk riêng (dynamic import).
- Refetch chủ động 10–60s + không refetch khi mất focus; demo mode không gọi RPC.

## 8. Test & Iterate

- Ma trận kiểm thử screenshot: 6 tab × 2 kích thước × 2 theme, 0 page error.
- QA nút tự động: ~50 nút/tác vụ bấm thử, 0 lỗi; bấm nhanh spam gộp 1 lượt.
- Usability test thực địa đề xuất: 5 sinh viên chạy kịch bản "đặt mục tiêu → gửi → quay → claim", đo thờ gian hoàn thành & tỷ lệ lỗi (làm trước Demo Day nếu còn thờ gian).
