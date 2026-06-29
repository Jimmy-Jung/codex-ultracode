# Changelog

> 작성자: JunyoungJung
> 작성일: 2026-06-19

이 문서는 `codex-ultracode`의 사용자에게 보이는 변경 사항을 기록한다.

## [1.0.2] - 2026-06-29

### Added

- README에 영어 버전을 추가했다(상단 언어 nav + 하단 `# Ultracode (English)` 전체 미러). 한 페이지 바이링궐 구조.
- 영어판도 mermaid 차트 9종·표·수치를 한국어판과 1:1로 맞췄다.

### Changed

- 플러그인 manifest 버전을 `1.0.2`로 올렸다.
- README의 로그 점검 예시 버전을 `1.0.2`로 정렬했다.

### Verified

- `python3 -m json.tool .codex-plugin/plugin.json`
- `node --check scripts/ultracode-doctor-logs.mjs`
- `git diff --check`

## [1.0.1] - 2026-06-29

### Changed

- README를 한국어 단독 단일 페이지로 재작성했다(영어 절과 `<details>` 토글 전부 제거).
- 플러그인 manifest 버전을 `1.0.1`로 올렸다.

### Added

- README 최상단에 "한눈에 — 가장 큰 장점" 요약과 벤치마크 그래프(대규모 감사 recall: 일반 codex 69.6% vs ultracode 95.7%, 사이클 7)를 추가했다.
- "배경" 절(Codex·스킬·서브에이전트·fan-out·토큰·SWE-bench Pro 용어 설명)과 "장점과 단점" 절을 추가했다.
- 벤치 8사이클 실측을 본문에 정리하고(단일 수정 동률·effort 무관·감사 recall·부피가 변수), 전문 용어에 괄호 부연을 전면 보강했다.

### Verified

- `python3 -m json.tool .codex-plugin/plugin.json`
- `node --check scripts/ultracode-doctor-logs.mjs`
- `git diff --check`

## [1.0.0] - 2026-06-23

### Added

- `.agents/plugins/marketplace.json`를 추가해 GitHub 저장소를 Codex marketplace source로 등록할 수 있게 했다.
- README에 일반 사용자용 Codex 플러그인 설치 명령을 추가했다.

### Changed

- 플러그인 manifest 버전을 `1.0.0`으로 올렸다.
- README의 현재 플러그인 cache/doctor 예시를 `1.0.0` 기준으로 갱신했다.

### Verified

- `node --check scripts/ultracode-doctor-logs.mjs`
- `node --test tests/ultracode-doctor-logs.test.mjs`
- `python3 -m json.tool .codex-plugin/plugin.json`
- `python3 -m json.tool .agents/plugins/marketplace.json`
- `codex plugin marketplace add <repo> && codex plugin add codex-ultracode@codex-ultracode --json` with a temporary `HOME`
- `git diff --check`

## [0.2.5] - 2026-06-22

### Added

- `ultracode-doctor-logs.mjs`에 `--legacy-missing-version warning` 옵션을 추가해, plugin version이 없는 legacy metrics를 명시적으로 warning 취급할 수 있게 했다.
- `ultracode-doctor-logs.mjs`에 `--workspace-key-normalized` 옵션을 추가해, workspace key 대소문자/구분자 차이를 opt-in으로 정규화해 비교할 수 있게 했다.
- legacy no-plugin metrics와 normalized workspace matching 회귀 테스트를 추가했다.
- README에 영어 버전을 추가했다.

### Verified

- `node --check scripts/ultracode-doctor-logs.mjs`
- `node --test tests/ultracode-doctor-logs.test.mjs` (5 pass)
- `git diff --check`

## [0.2.4] - 2026-06-22

### Changed

- doctor JSON 출력에서 `errors_by_code`/`warnings_by_code`와 중복되던 `issues_by_code` 필드를 제거했다.

### Fixed

- `.gitignore`를 추가해 mitmproxy MCP 산출물(`*.db`)과 `.DS_Store`가 저장소에 섞이지 않도록 했다.

### Verified

- `node --check scripts/ultracode-doctor-logs.mjs`
- `node --test tests/ultracode-doctor-logs.test.mjs` (3 pass)

## [0.2.3] - 2026-06-21

### Added

- `scripts/ultracode-doctor-logs.mjs`에 완료 상태 run만 검사하는 `--terminal-only` 옵션을 추가했다.
- doctor JSON/human 출력에 `terminal_metrics_checked`, `nonterminal_metrics_skipped`, `warnings_by_code`, `errors_by_code` 요약을 추가했다.
- doctor가 `metrics.plugin.version`을 기준으로 `0.2.1` 이후 추가된 필드를 과거 `0.2.0` 로그에 강제하지 않도록 version-aware required-field 검사를 추가했다.
- fixture 기반 `node:test` 회귀 테스트를 추가해 summary plugin metadata 누락과 `summary_append_ok` 미확정 warning을 실제 로그 없이 검증한다.

### Verified

- `node --test tests/ultracode-doctor-logs.test.mjs`
- `node --check scripts/ultracode-doctor-logs.mjs`
- `node scripts/ultracode-doctor-logs.mjs --plugin-version 0.2.2 --workspace-key users-jimmy-documents-github-codex-ultracode --terminal-only --fail-on warning --json`
- `node scripts/ultracode-doctor-logs.mjs --plugin-version 0.2.1 --terminal-only --fail-on warning --json` (expected warning exit)

## [0.2.2] - 2026-06-20

### Added

- `scripts/ultracode-doctor-logs.mjs`에 `0.2.1` 이상 run의 summary plugin metadata 누락/불일치와 terminal `summary_append_ok` 미확정을 warning으로 잡는 검사를 추가했다.

### Verified

- `node --check scripts/ultracode-doctor-logs.mjs`
- `node scripts/ultracode-doctor-logs.mjs --run-root <0-2-1-log-finalizer-release> --fail-on warning --json`
- `node scripts/ultracode-doctor-logs.mjs --run-root <aitutor-chat-math-rendering> --fail-on error --json`
- `node scripts/ultracode-doctor-logs.mjs --plugin-version 0.2.1 --fail-on error --json`
- `git diff --check`

## [0.2.1] - 2026-06-20

### Added

- `scripts/ultracode-doctor-logs.mjs`를 추가해 Ultracode log root의 `state.json`, `metrics.json`, `summary.jsonl` 정합성을 점검할 수 있게 했다.
- `SKILL.md`에 run 완료 전 finalization checklist를 추가했다.
- `packet-schema.md`에 `summary_append_ok`의 의미를 matching `summary.jsonl` record 재검증으로 명확히 했다.
- `packet-schema.md`와 `js-runner.md`에 reviewer timeout attempt와 eventual review pass를 분리해 기록하는 필드를 추가했다.
- `forward-testing.md`에 log finalizer regression 체크를 추가했다.

### Changed

- `metrics.status` 설명을 run status enum과 맞춰 `planning`, `waiting_for_approval`, `executing`, `integrating`, `verifying`, `complete`, `blocked`, `cancelled`를 허용하도록 정리했다.
- README에 `ultracode-doctor-logs.mjs` 사용법과 private Codex log를 읽지 않는 경계를 추가했다.

### Verified

- `node --check scripts/ultracode-doctor-logs.mjs`
- `node scripts/ultracode-doctor-logs.mjs --plugin-version 0.2.0 --json`
- `node` 기반 skill 구조/frontmatter sanity check
- `python3 -m json.tool .codex-plugin/plugin.json`
- `git diff --check`

## [0.2.0] - 2026-06-19

### Added

- README에 불명확한 `$ultracode` 요청을 안전하게 다루는 예시를 추가했다.
- README에 Codex에서 사용하는 선택적 표면(`/permissions`, `/diff`, `/review`, `/status`, `/mcp`, `codex exec`)을 추가했다.
- `packet-schema.md`의 result template에 `Recommended parent action`을 추가했다.
- `packet-schema.md`의 `state.json` 예시에 `agents[]`와 `agent_isolation_policy`를 추가했다.
- `packet-schema.md`의 `metrics.json`과 `summary.jsonl` schema에 플러그인 이름/버전 기록 필드를 추가했다.
- `SKILL.md`의 로그 작성 지침에 플러그인 manifest 기반 name/version 기록 규칙을 추가했다.
- 유지보수 분석을 위해 host, invocation, capabilities, safety, failure, artifact health, revision 로그 필드를 추가했다.
- `packet-schema.md`의 `integration.md` template에 `Contrary evidence` 섹션을 추가했다.
- `forward-testing.md`에 fresh-session smoke 실행 기준과 최소 smoke prompt를 추가했다.

### Changed

- README의 저장소 구조와 읽는 순서를 현재 패키지 구성에 맞게 갱신했다.
- README에 `js-runner.md`가 실제 JavaScript runner가 아니라 Codex-native adapter 문서라는 설명을 추가했다.
- README에 workflow artifact는 판단 근거와 실행 기록이고, canonical policy는 `skills/ultracode/SKILL.md`와 명시 관리 문서에 둔다는 원칙을 추가했다.
- `packet-schema.md`에서 `review_run` checkpoint가 `/review`, reviewer subagent, equivalent independent review를 포함하도록 의미를 분명히 했다.
- `js-runner.md`의 최소 `metrics.json` 예시에 플러그인 manifest 기반 버전 기록을 반영했다.
- `SKILL.md`, `packet-schema.md`, `js-runner.md`에 raw prompt/source/secret/long output을 로그에 남기지 않는 privacy-safe telemetry 원칙을 명시했다.
- `forward-testing.md` validation checklist에 behavior-changing skill/reference edit 후 fresh-session smoke 또는 skip reason 기록을 추가했다.

### Removed

- 초안 성격의 `docs/` 디렉터리를 제거했다.

### Verified

- `quick_validate.py skills/ultracode`
- `git diff --check`
- `packet-schema.md`와 `js-runner.md`의 Markdown JSON code block parse 확인
- Fresh-session smoke로 불명확한 `this` 요청이 넓은 파일 수정으로 이어지지 않고, 대상 확인 질문과 read-only discovery 기본값으로 처리되는지 확인했다.
