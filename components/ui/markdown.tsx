"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// LLM 결과물(마크다운) 렌더러. 원시 HTML은 렌더하지 않는다(react-markdown 기본값).
export function Markdown({ children }: { children: string }) {
  return (
    <div className="md text-sm leading-relaxed text-slate-200">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
