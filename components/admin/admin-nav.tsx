import Link from "next/link";

const LINKS = [
  { href: "/office", label: "오피스" },
  { href: "/admin/users", label: "사용자" },
  { href: "/admin/projects", label: "프로젝트" },
  { href: "/admin/models", label: "모델 · API 키" },
  { href: "/admin/costs", label: "비용 · 설정" },
];

export function AdminNav({ current }: { current: string }) {
  return (
    <nav className="mb-6 flex gap-4 border-b pb-3 text-sm">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={l.href === current ? "font-semibold" : "text-muted-foreground hover:underline"}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
