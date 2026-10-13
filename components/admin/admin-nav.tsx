import Link from "next/link";

type NavLink = { href: string; label: string };

const GLOBAL: NavLink[] = [
  { href: "/projects", label: "프로젝트 목록" },
  { href: "/admin/users", label: "사용자" },
  { href: "/admin/models", label: "모델 · API 키" },
];

const inWorkspace = (id: string): NavLink[] => [
  { href: `/p/${id}`, label: "오피스" },
  { href: `/p/${id}/results`, label: "결과물" },
  { href: `/p/${id}/admin/work`, label: "업무" },
  { href: `/p/${id}/admin/costs`, label: "비용 · 설정" },
];

// 관리자 페이지 상단 내비. workspace가 있으면 그 프로젝트 메뉴, 없으면 전역 메뉴.
export function AdminNav({ current, workspace }: { current: string; workspace?: { id: string; name: string } }) {
  const links = workspace ? inWorkspace(workspace.id) : GLOBAL;
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-4 border-b pb-3 text-sm">
      {workspace && (
        <Link href="/projects" className="text-muted-foreground hover:underline">
          ← {workspace.name}
        </Link>
      )}
      {links.map((l) => (
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
