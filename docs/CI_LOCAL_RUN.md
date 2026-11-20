# Bằng chứng pipeline kiểm thử chạy local (thay thế khi GitHub Actions bị khoá)

> **Trạng thái GitHub Actions**: các run trên repo hiện fail sau ~2 giây, không có bước
> nào được thực thi. Annotation chính thức từ GitHub API (check-run):
> *"The job was not started because your account is locked due to a billing issue."*
> — tài khoản chủ repo bị khoá billing ở cấp tài khoản (plan Free, public repo, dùng $0/$12
> hạn mức miễn phí), GitHub không cấp runner nên **không một dòng test nào chạy**. Đây là
> sự cố hạ tầng tài khoản, không phải lỗi test/build. Workflow (.github/workflows/ci.yml)
> sẵn sàng chạy ngay khi tài khoản được mở khoá.
>
> Trong lúc chờ mở khoá, toàn bộ pipeline CI tương đương được chạy và ghi nhận tại đây.

## Kết quả chạy local (đúng cấu hình CI: Playwright workers=1, retries=2)

- **Thờ điểm:** 2026-11-20 17:11 SEAST · **Commit:** 89c3bfd · **Máy:** Windows 11, Node 20, Foundry (forge 0.8.x)

| Bước | Lệnh | Kết quả |
|---|---|---|
| 1. Contract tests | `cd contracts && forge test` | **73/73 pass** (6 suite: unit + fuzz + invariant + security) |
| 2. Type check | `cd web && npx tsc --noEmit` | **0 lỗi** |
| 3. Production build | `cd web && npm run build` | **Compiled successfully**, prerender 5/5 trang |
| 4. E2E (CI config) | `cd web && CI=1 npx playwright test` | **10/10 pass** (6 test × desktop 1440×900 + mobile 390×844), 51.2s |

```
Ran 6 test suites in 10.43s (46.16s CPU time): 73 tests passed, 0 failed, 0 skipped (73 total tests)
```

Giám khảo có thể tự tái lập toàn bộ bằng 4 lệnh trên trên bất kỳ máy nào có
Foundry + Node 20 (xem README mục "Chạy local").
