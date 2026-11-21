"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useCallback, useState } from "react";
import { useWriteContract, useSwitchChain } from "wagmi";
import { waitForTransactionReceipt, getAccount } from "@wagmi/core";
import { BaseError } from "viem";
import { wagmiConfig, targetChainId, fuji, explorerTx } from "@/lib/config";
import { sfx } from "@/lib/sound";
import { isDemoMode } from "@/lib/demo";

/** Đọc trực tiếp eth_chainId từ provider của ví — phản ánh đúng mạng MetaMask
 *  đang chọn ngay lúc gửi, không phụ thuộc state chainId có thể đã lỗi thờ của wagmi. */
async function liveChainId(): Promise<number | null> {
  try {
    const connector = getAccount(wagmiConfig).connector;
    if (!connector) return null;
    const provider = (await connector.getProvider()) as {
      request: (args: { method: string }) => Promise<unknown>;
    };
    return Number(await provider.request({ method: "eth_chainId" }));
  } catch {
    return null;
  }
}

/** Giới hạn chờ ví ký; quá lâu → báo lỗi hướng dẫn thay vì treo spinner vô thời hạn
 *  (ví dụ MetaMask đang ở "Unsupported Network" và không tự popup ký). */
const WALLET_TIMEOUT_MS = 75_000;
function withWalletTimeout<T>(p: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("WalletTimeout")), WALLET_TIMEOUT_MS);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export interface TxState {
  step: string | null;
  stepValues?: string[];
  hash: string | null;
  error: string | null;
  errorLabel?: string;
  /** Thông báo mô phỏng khi đang ở chế độ demo (không phải lỗi). */
  info?: string | null;
  /** Vị trí bước hiện tại / tổng số bước (1-based) cho tx stepper. */
  stepIndex?: number;
  stepTotal?: number;
  /** Giao dịch thành công — giữ thẻ bằng chứng cho đến khi ngườ dùng đóng. */
  done?: boolean;
}

export interface TxLogEntry {
  label: string;
  labelValues?: string[];
  hash: string;
  at: number;
  address: string;
  chainId: number;
}

/** Nhật ký giao dịch thành công — lưu localStorage THEO TỪNG VÍ (chainId + địa chỉ),
 *  đổi ví không thấy giao dịch của ví trước trên cùng trình duyệt. */
export function readTxLog(address?: string, chainId?: number): TxLogEntry[] {
  if (typeof window === "undefined") return [];
  const key = address ? `cozy-txlog:${chainId ?? 0}:${address.toLowerCase()}` : "cozy-txlog";
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as TxLogEntry[];
  } catch {
    return [];
  }
}

function pushTxLog(entry: TxLogEntry, address: string, chainId: number) {
  const key = `cozy-txlog:${chainId}:${address.toLowerCase()}`;
  const log = [entry, ...readTxLog(address, chainId)].slice(0, 8);
  localStorage.setItem(key, JSON.stringify(log));
  window.dispatchEvent(new Event("cozy-txlog"));
}

/** Decode lỗi Solidity / ví thành tiếng Việt gọn gàng, không đổ raw hex ra UI. */
function decodeError(err: BaseError): string {
  const raw = err.message ?? "";
  const short = err.shortMessage ?? "";

  // Wallet / RPC
  if (err.name === "UserRejectedRequestError" || raw.includes("User denied") || raw.includes("rejected")) {
    return "Bạn đã từ chối ký giao dịch.";
  }
  if (raw.includes("HTTP request failed") || raw.includes("fetch")) {
    return "Kết nối RPC Fuji bị gián đoạn — thử lại sau vài giây (giao dịch có thể đã thực hiện, kiểm tra Snowtrace trước khi gửi lại).";
  }
  if (raw.includes("WalletTimeout")) {
    return "Ví không phản hồi — MetaMask có thể đang ở mạng không hỗ trợ. Mở ví, chuyển sang Avalanche Fuji rồi thử lại (nếu đã bấm ký, kiểm tra Snowtrace trước khi gửi lại).";
  }
  if (raw.includes("insufficient funds")) {
    return "Không đủ AVAX để trả phí gas.";
  }

  // Custom errors 8 core contracts
  const checks = [
    { key: "AlreadyCheckedIn", vi: "Bạn đã điểm danh hôm nay rồi." },
    { key: "AlreadyDripped", vi: "Ví này đã nhận vòi nước rồi." },
    { key: "EpochCapReached", vi: "Vòi nước đã đạt giới hạn kỳ này — thử lại kỳ sau." },
    { key: "NotActivatedAlready", vi: "Chưa đến giờ mở kỳ đầu tiên." },
    { key: "GoalAlreadySet", vi: "Bạn đã có một mục tiêu đang chạy." },
    { key: "GoalNotActive", vi: "Mục tiêu không còn hiệu lực hoặc chưa đạt." },
    { key: "StreakNotReached", vi: "Chưa đủ streak để nhận huy hiệu này." },
    { key: "AlreadyMinted", vi: "Bạn đã sở hữu huy hiệu này rồi." },
    { key: "NotOperator", vi: "Không có quyền thực hiện thao tác này." },
    { key: "NotInitializer", vi: "Hàm chỉ được gọi một lần bởi deployer." },
    { key: "NotDistributor", vi: "Chỉ distributor mới được chốt kỳ." },
    { key: "DistributorAlreadySet", vi: "Distributor đã được thiết lập trước đó." },
    { key: "InsufficientPrincipal", vi: "Không đủ gốc trong tòa nhà để rút." },
    { key: "MaxParticipantsReached", vi: "Đã đạt số ngườ tham gia tối đa của kỳ." },
    { key: "EpochOutOfOrder", vi: "Chốt kỳ phải theo thứ tự — không được bỏ qua kỳ." },
    { key: "EpochNotEnded", vi: "Kỳ chưa kết thúc, chưa thể chốt." },
    { key: "AlreadyReleased", vi: "Ngân sách kỳ này đã được giải ngân." },
    { key: "FundingClosed", vi: "Đã quá hạn để nạp ngân sách cho kỳ này." },
    { key: "DepositBelowMinimum", vi: "Số tiền gửi thấp hơn mức tối thiểu." },
    { key: "DepositOverEpochLimit", vi: "Số tiền gửi vượt quá giới hạn mỗi kỳ." },
    { key: "NothingToClaim", vi: "Hiện không có lãi nào để nhận." },
    { key: "InvalidReferrer", vi: "Mã giới thiệu không hợp lệ." },
    { key: "AlreadyFrozen", vi: "Bạn đã đóng băng kỳ này rồi." },
    { key: "AlreadyInsured", vi: "Bạn đã mua bảo hiểm kỳ này rồi." },
    { key: "NothingToRevive", vi: "Không có streak nào cần hồi sinh." },
    { key: "ReviveWindowClosed", vi: "Đã quá thời hạn để hồi sinh streak." },
    { key: "NotStarted", vi: "Chưa đến giờ mở kỳ đầu tiên." },
    { key: "ZeroAmount", vi: "Số tiền phải lớn hơn 0." },
    { key: "ZeroAddress", vi: "Địa chỉ không hợp lệ." },
  ];
  const haystack = `${short} ${raw}`.toLowerCase();
  for (const c of checks) {
    if (haystack.includes(c.key.toLowerCase())) return c.vi;
  }

  return short || raw || "Đã có lỗi xảy ra — kiểm tra Snowtrace hoặc thử lại.";
}

/** Gói writeContractAsync + chờ receipt, trả về trạng thái stepper để hiển thị. Tự chuyển chain nếu ví đang sai mạng. */
export function useTx() {
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const [state, setState] = useState<TxState>({ step: null, hash: null, error: null });

  const run = useCallback(
    async (label: string, calls: Array<{ label: string; labelValues?: string[]; call: Parameters<typeof writeContractAsync>[0] }>) => {
      setState({ step: null, hash: null, error: null });
      if (isDemoMode()) {
        setState({ step: null, hash: null, error: null, info: "Chế độ demo — giao dịch chỉ mô phỏng. Kết nối ví để thực hiện thật." });
        return false;
      }
      try {
        // Kiểm tra lại mạng thật của ví ngay trước khi gửi — tránh treo tx khi
        // MetaMask đang ở mạng khác mà state wagmi vẫn báo đúng Fuji.
        const live = await liveChainId();
        if (live !== null && live !== targetChainId) {
          setState((s) => ({ ...s, step: "Đang chuyển sang Avalanche Fuji…" }));
          await switchChainAsync({ chainId: targetChainId });
          const after = await liveChainId();
          if (after !== null && after !== targetChainId) {
            throw new Error("Ví vẫn ở mạng khác — hãy chuyển sang Avalanche Fuji trong ví rồi thử lại.");
          }
        }
        let lastHash: string | null = null;
        for (let i = 0; i < calls.length; i++) {
          const c = calls[i];
          setState((s) => ({ ...s, step: c.label, stepValues: c.labelValues, stepIndex: i + 1, stepTotal: calls.length }));
          const hash = await withWalletTimeout(writeContractAsync(c.call));
          lastHash = hash;
          setState((s) => ({ ...s, hash }));
          await waitForTransactionReceipt(wagmiConfig, {
            hash,
            chainId: fuji.id,
            timeout: 90_000,
            retryCount: 5,
            retryDelay: 2_000,
          });
          const acc = getAccount(wagmiConfig);
          pushTxLog({ label: c.label, labelValues: c.labelValues, hash, at: Date.now(), address: acc.address ?? "", chainId: acc.chainId ?? 0 }, acc.address ?? "", acc.chainId ?? 0);
        }
        setState({ step: null, hash: lastHash, error: null, done: true, info: null });
        sfx.success();
        return true;
      } catch (e) {
        sfx.error();
        const err = e as BaseError;
        setState({ step: null, hash: null, error: decodeError(err), errorLabel: label });
        return false;
      }
    },
    [writeContractAsync, switchChainAsync],
  );

  const clear = useCallback(() => setState({ step: null, hash: null, error: null, done: false }), []);

  return { run, clear, ...state };
}

/** Stepper trạng thái giao dịch: Approve (bước 1/n) -> ... -> Success kèm link Snowtrace.
 *  Thẻ thành công ĐƯỢC GIỮ cho đến khi ngườ dùng đóng — ngườ dùng kịp chụp/đối chiếu hash. */
export function TxFeedback({ state, onDismiss }: { state: TxState; onDismiss?: () => void }) {
  const { t: translate } = useLanguage();
  if (state.done && state.hash && !state.step && !state.error) {
    return (
      <div role="status" aria-live="polite" className="mt-3 rounded-xl border border-cta/40 bg-cta/10 px-3 py-2.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-cozy font-extrabold text-cta">{translate("✓ Giao dịch thành công")}</span>
          {onDismiss && (
            <button className="text-xs font-bold text-ink-soft hover:text-ink" onClick={onDismiss}>
              {translate("Đóng")}
            </button>
          )}
        </div>
        <a
          className="mt-0.5 block truncate text-xs font-bold underline"
          href={explorerTx(state.hash)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {translate("Xem trên Snowtrace: {0}", [state.hash])}
        </a>
      </div>
    );
  }
  if (state.info && !state.step && !state.error) {
    return (
      <div role="status" aria-live="polite" className="mt-3 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink-soft">
        {translate(state.info)}
      </div>
    );
  }
  if (!state.step && !state.error) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-3 rounded-xl border px-3 py-2.5 text-sm ${
        state.error ? "border-danger/40 bg-danger/10 text-danger" : "border-cta/40 bg-cta/10 text-ink"
      }`}
    >
      {state.error ? (state.errorLabel ? `${translate(state.errorLabel)}: ${translate(state.error)}` : translate(state.error)) : (
        <div className="flex items-center gap-2.5">
          <span className="flex flex-col items-center gap-0.5">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cta border-t-transparent" />
          </span>
          <div>
            {state.stepTotal && state.stepTotal > 1 ? (
              <div className="font-cozy text-xs font-extrabold uppercase tracking-wide text-cta">
                {translate("Bước {0}/{1}", [state.stepIndex, state.stepTotal])}
              </div>
            ) : null}
            <div className="font-semibold">{state.step && translate(state.step, state.stepValues)}</div>
          </div>
        </div>
      )}
      {state.hash && !state.error && (
        <a
          className="mt-1 block truncate text-xs font-bold underline opacity-80"
          href={explorerTx(state.hash)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {translate("Xem giao dịch: {0}", [state.hash])}
        </a>
      )}
    </div>
  );
}
