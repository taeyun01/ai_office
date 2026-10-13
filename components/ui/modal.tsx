"use client";

import { X } from "lucide-react";

// 단순 모달. 반투명 다크 배경 + 얇은 시안 테두리 (§7.9)
export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`max-h-[90svh] w-full overflow-y-auto rounded-xl border border-cyan-500/40 bg-[#0b1020]/95 p-5 text-slate-100 shadow-2xl backdrop-blur ${wide ? "max-w-2xl" : "max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="닫기" className="rounded p-1 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const fieldClass =
  "w-full rounded-md border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none";
export const labelClass = "mb-1 block text-xs text-slate-400";
