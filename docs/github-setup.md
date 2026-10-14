# GitHub 연동 설정 (AI 직원이 코드로 일하게 하기)

## 어떻게 동작하나

1. 오피스에서 **코드 작업 담당** 직원에게 작업이 가면(직접 지시든 AI 팀장 분배든), 작업 엔진이 프로젝트 저장소에 `ai-office` 라벨을 붙인 **GitHub 이슈**를 만듭니다. 직원은 오피스에서 "작업 중"으로 보입니다.
2. 저장소의 `.github/workflows/ai-office.yml`이 라벨을 보고 **Claude Code**를 실행합니다. Claude Code는 저장소의 `CLAUDE.md`·스킬·플러그인 설정을 그대로 따르고, `claude/issue-N` 브랜치에서 작업한 뒤 **PR**을 엽니다(본문 첫 줄 `Closes #N`).
3. AIOffice가 5분마다 PR을 확인해서, PR이 보이면 작업을 **완료**로 바꾸고 결과물에 PR 링크와 요약을 남깁니다.
4. **머지는 사람이 합니다.** AI는 PR까지만 올립니다.

- PR 없이 이슈가 닫히거나 6시간이 지나면 작업은 실패로 바뀝니다(Actions 로그를 확인하세요).
- Claude Code 실행 비용은 GitHub 저장소 시크릿에 넣은 Anthropic 키로 청구됩니다. AIOffice의 월 예산에는 잡히지 않습니다.

## 저장소마다 한 번만 하면 되는 설정

### 1. 워크플로 파일 넣기
`.github/workflows/ai-office.yml`을 그 저장소의 기본 브랜치에 넣습니다. (`taeyun01/ai_office`에는 이미 들어가 있습니다. 다른 저장소는 이 파일을 복사하세요. 그 저장소에 `npm run typecheck`가 없으면 프롬프트 4번 줄을 저장소에 맞게 고치세요.)

### 2. Anthropic API 키를 저장소 시크릿으로
둘 중 하나:
- 그 저장소 폴더에서 Claude Code를 열고 `/install-github-app` 실행 → Claude GitHub 앱 설치와 `ANTHROPIC_API_KEY` 시크릿 등록을 안내해 줍니다. (설치 과정에서 워크플로 파일을 추가하는 PR을 만들자고 하면, 1번 파일이 이미 있으니 건너뛰어도 됩니다.)
- 또는 터미널에서: `gh secret set ANTHROPIC_API_KEY -R owner/repo` (입력창에 키 붙여넣기)

### 3. Actions가 PR을 만들 수 있게 허용
저장소 **Settings → Actions → General → Workflow permissions**에서
- "Read and write permissions" 선택
- **"Allow GitHub Actions to create and approve pull requests"** 체크

### 4. AIOffice용 GitHub 토큰 만들기 (이슈 생성·PR 확인용)
GitHub → Settings → Developer settings → **Fine-grained personal access tokens** → Generate new token
- Repository access: **Only select repositories** → 그 저장소만
- Permissions (Repository):
  - **Issues: Read and write**
  - **Pull requests: Read-only**
  - **Contents: Read-only**
  - Metadata: Read-only (자동)
- 만료일은 원하는 대로(만료되면 AIOffice에서 교체)

### 5. AIOffice에 등록
1. 프로젝트 목록에서 프로젝트 **수정** → GitHub 저장소 주소 확인
2. 그 프로젝트 오피스 → **비용** (또는 `/p/<프로젝트 id>/admin/costs`) → **GitHub 연동** 카드에 4번 토큰 붙여넣고 **등록**
3. "연결 정상: 저장소 접근·ai-office 라벨·워크플로 확인됨"이 나오면 끝

### 6. 코드 작업 담당 지정
오피스에서 직원 클릭 → **수정** → "코드 작업 담당" 체크. (기본 프로젝트 "AI 오피스"는 김민준·이서연이 이미 켜져 있습니다.)

## 첫 테스트
1. 오피스 → **작업 지시 → 직원에게 직접** → 담당: 김민준, 제목 예: "README에 GitHub 연동 섹션 추가", 지시: 무엇을 바꿀지 구체적으로
2. **지금 실행** → 작업 현황에 "GitHub 이슈 #N 생성"이 뜨고, 저장소 Issues에 이슈가 생깁니다
3. 저장소 **Actions** 탭에서 "AI Office" 실행 확인 → PR 생성
4. 5분 안에 오피스 작업이 완료로 바뀌고, 결과물 탭에 PR 링크가 보입니다

## 보안 메모
- AIOffice는 토큰을 Supabase Vault에만 저장하고 화면·로그에 다시 보여주지 않습니다(마지막 4자리만).
- 공개 저장소라도 `ai-office` 라벨은 쓰기 권한이 있는 사람과 AIOffice 토큰만 붙일 수 있어서, 외부인이 Claude Code를 돌릴 수 없습니다. 그래도 **이슈 본문은 공개**됩니다. 비밀 정보는 작업 지시에 쓰지 마세요.
