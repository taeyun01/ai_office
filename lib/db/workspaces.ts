import type { Db } from "@/types";

export async function listWorkspaces(db: Db) {
  const { data, error } = await db.from("workspaces").select("*").order("created_at");
  if (error) throw error;
  return data;
}

// 없거나 볼 권한이 없으면 null
export async function getWorkspace(db: Db, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data, error } = await db.from("workspaces").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

// "https://github.com/owner/repo(.git)" 또는 "owner/repo" → "owner/repo". 비우면 null.
export function normalizeGithubRepo(input: string): string | null {
  const v = input.trim().replace(/\.git$/, "").replace(/\/+$/, "");
  if (!v) return null;
  const m = v.match(/^(?:https?:\/\/)?(?:www\.)?(?:github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!m) throw new Error("GitHub 저장소는 https://github.com/owner/repo 또는 owner/repo 형식으로 입력하세요.");
  return `${m[1]}/${m[2]}`;
}
