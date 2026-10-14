// GitHub REST 최소 래퍼 (Edge Function 공용). 토큰은 호출자가 Vault에서 꺼내 넘긴다.
const API = "https://api.github.com";
export const AI_LABEL = "ai-office";

export class GithubError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function gh<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const reason =
      res.status === 401 ? "토큰이 잘못됨"
      : res.status === 403 ? "토큰 권한 부족 또는 요청 한도 초과"
      : res.status === 404 ? "저장소를 찾을 수 없음(토큰의 저장소 접근 권한 확인)"
      : `GitHub 오류 ${res.status}`;
    throw new GithubError(reason, res.status);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export type Issue = { number: number; html_url: string; state: "open" | "closed"; state_reason: string | null };
export type Pull = { number: number; html_url: string; title: string; body: string | null; state: string; merged_at: string | null; head: { ref: string } };

export const getRepo = (token: string, repo: string) =>
  gh<{ full_name: string; permissions?: { push?: boolean } }>(token, `/repos/${repo}`);

// 라벨이 없으면 만든다 (이미 있으면 422 → 무시)
export async function ensureLabel(token: string, repo: string) {
  try {
    await gh(token, `/repos/${repo}/labels`, {
      method: "POST",
      body: JSON.stringify({ name: AI_LABEL, color: "22d3ee", description: "AIOffice AI 직원 작업 (Claude Code가 처리)" }),
    });
  } catch (e) {
    if (!(e instanceof GithubError && e.status === 422)) throw e;
  }
}

// 라벨을 붙여서 만든다 → 저장소의 Claude Code Action(label_trigger)이 시작된다
export const createIssue = (token: string, repo: string, title: string, body: string) =>
  gh<Issue>(token, `/repos/${repo}/issues`, { method: "POST", body: JSON.stringify({ title, body, labels: [AI_LABEL] }) });

export const getIssue = (token: string, repo: string, n: number) => gh<Issue>(token, `/repos/${repo}/issues/${n}`);

export const listRecentPulls = (token: string, repo: string) =>
  gh<Pull[]>(token, `/repos/${repo}/pulls?state=all&sort=created&direction=desc&per_page=50`);

export const hasWorkflow = async (token: string, repo: string) => {
  try {
    await gh(token, `/repos/${repo}/contents/.github/workflows/ai-office.yml`);
    return true;
  } catch (e) {
    if (e instanceof GithubError && e.status === 404) return false;
    throw e;
  }
};

// PR이 이 이슈를 닫는다고 했거나(Closes #N), Claude 브랜치 이름에 이슈 번호가 있으면 연결된 PR로 본다
export function pullForIssue(pulls: Pull[], issue: number): Pull | undefined {
  const closes = new RegExp(`\\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\\s+#${issue}\\b`, "i");
  return pulls.find((p) => closes.test(p.body ?? "") || new RegExp(`issue-${issue}(\\D|$)`).test(p.head.ref));
}
