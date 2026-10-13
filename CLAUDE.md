@AGENTS.md

# 무조건 한국말로 대답하기

- 답변은 무조건 한국말로.

## Supabase RLS 규칙

- 사용자별 데이터 테이블은 RLS를 기본으로 켠다.
- `user_id`가 있으면 `auth.uid() = user_id` 기준으로 본인 row만 허용한다.
- 새 테이블을 만들 때 필요한 SELECT/INSERT/UPDATE/DELETE policy를 함께 설계한다.
- UPDATE는 보통 `USING`과 `WITH CHECK`를 함께 검토한다.
- migration에 RLS enabled와 policy SQL이 같이 들어갔는지 확인한다.

## 컴포넌트는 재사용

- 컴포넌트는 최대한 재 사용할 수 있도록 구현해서 사용하기.
