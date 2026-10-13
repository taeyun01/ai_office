// LLM 어댑터. 엔진은 이 함수 하나만 알면 된다 (§7.7).
// 새 제공사를 추가하려면 PROVIDERS 에 한 줄 + DB enum 값만 추가한다.
import { generateText, APICallError } from "npm:ai@5";
import { createAnthropic } from "npm:@ai-sdk/anthropic@2";
import { createOpenAI } from "npm:@ai-sdk/openai@2";
import { createGoogleGenerativeAI } from "npm:@ai-sdk/google@2";

export type Provider = "anthropic" | "openai" | "google";

const PROVIDERS: Record<Provider, (apiKey: string) => (model: string) => Parameters<typeof generateText>[0]["model"]> = {
  anthropic: (apiKey) => createAnthropic({ apiKey }),
  openai: (apiKey) => createOpenAI({ apiKey }),
  google: (apiKey) => createGoogleGenerativeAI({ apiKey }),
};

// 환경변수 대체 키 (Vault에 키가 없을 때만)
export const ENV_KEY: Record<Provider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

export class LlmError extends Error {
  constructor(
    message: string,
    public kind: "auth" | "rate_limit" | "server" | "network" | "other",
    public retryable: boolean,
  ) {
    super(message);
  }
}

// 제공사 SDK 에러에 키가 섞여 나올 수 있으므로 키 패턴을 가린다
export function maskSecrets(text: string, ...keys: (string | undefined)[]) {
  let out = text;
  for (const k of keys) if (k) out = out.split(k).join("***");
  return out.replace(/(sk-ant-[A-Za-z0-9_-]{6,}|sk-[A-Za-z0-9_-]{12,}|AIza[0-9A-Za-z_-]{20,})/g, "***");
}

function normalize(e: unknown, apiKey: string): LlmError {
  if (APICallError.isInstance(e)) {
    const s = e.statusCode ?? 0;
    const msg = maskSecrets(e.message, apiKey);
    if (s === 401 || s === 403) return new LlmError("키가 잘못됨: " + msg, "auth", false);
    if (s === 429) return new LlmError("한도 초과: " + msg, "rate_limit", true);
    if (s >= 500) return new LlmError("서버 오류: " + msg, "server", true);
    if (s === 0) return new LlmError("네트워크 오류: " + msg, "network", true);
    return new LlmError(msg, "other", false);
  }
  const msg = maskSecrets(e instanceof Error ? e.message : String(e), apiKey);
  return new LlmError(msg, /fetch|network|ECONN|timeout/i.test(msg) ? "network" : "other", /fetch|network|ECONN|timeout/i.test(msg));
}

export async function generate(input: {
  provider: Provider;
  modelName: string;
  apiKey: string;
  system: string;
  prompt: string;
  maxTokens: number;
}): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const model = PROVIDERS[input.provider](input.apiKey)(input.modelName);
  try {
    const r = await generateText({
      model,
      system: input.system,
      prompt: input.prompt,
      maxOutputTokens: input.maxTokens,
    });
    return {
      text: r.text,
      inputTokens: r.usage.inputTokens ?? 0,
      outputTokens: r.usage.outputTokens ?? 0,
    };
  } catch (e) {
    throw normalize(e, input.apiKey);
  }
}
