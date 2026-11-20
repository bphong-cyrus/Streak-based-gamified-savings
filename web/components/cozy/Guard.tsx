"use client";

import { Component, type ReactNode } from "react";

interface GuardProps {
  children: ReactNode;
  /** UI thay thế khi nhánh con crash — app vẫn sống, không rơi xuống error boundary chung. */
  fallback: ReactNode;
  onError?: (err: Error) => void;
}

/** Error boundary nhỏ: cô lập lỗi render của một vùng (3D scene, preview...) thay vì crash cả app. */
export class Guard extends Component<GuardProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(err: Error) {
    console.error("[Guard] phát hiện lỗi render, đã chuyển sang fallback:", err);
    this.props.onError?.(err);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
