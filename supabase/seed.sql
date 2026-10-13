-- 시드: LLM 모델·제공사 + 기본 프로젝트 1개
-- 여러 번 실행해도 안전하도록 기존 행은 건너뜀

-- LLM 모델 (단가: USD / 100만 토큰)
insert into llm_models (provider, model_name, display_name, input_price_per_mtok, output_price_per_mtok, tier) values
  ('anthropic', 'claude-haiku-5-5',  'Claude Haiku 5.5',  0.10, 0.50,  'fast'),
  ('anthropic', 'claude-sonnet-5-5', 'Claude Sonnet 5.5', 2.00, 10.00, 'balanced'),
  ('anthropic', 'claude-opus-5-5',   'Claude Opus 5.5',   4.00, 20.00, 'premium'),
  -- TODO: OpenAI 모델 ID·단가는 공식 페이지(platform.openai.com/docs/pricing)에서 확인 필요. 출처별로 값이 다름
  ('openai',    'gpt-5.6-luna',      'GPT-5.6 Luna',      0.20, 1.20,  'fast'),
  ('openai',    'gpt-5.6-sol',       'GPT-5.6 Sol',       4.00, 20.00, 'premium'),
  -- TODO: Gemini 모델 ID는 공식 페이지(ai.google.dev/gemini-api/docs/pricing)에서 확인 필요
  ('google',    'gemini-3-flash',    'Gemini 3 Flash',    0.50, 3.00,  'fast'),
  ('google',    'gemini-3.1-pro',    'Gemini 3.1 Pro',    2.00, 12.00, 'premium')
on conflict (provider, model_name) do nothing;

insert into llm_providers (provider) values ('anthropic'), ('openai'), ('google')
on conflict do nothing;

-- 기본 프로젝트(오피스) 하나: 5개 부서 + 직원 15명 + 예산 설정 (migrations의 seed_workspace 사용)
do $$
declare ws uuid;
begin
  if not exists (select 1 from workspaces) then
    insert into workspaces (name, description) values ('AI 오피스', '처음 만든 기본 오피스') returning id into ws;
    perform seed_workspace(ws);
  end if;
end $$;
