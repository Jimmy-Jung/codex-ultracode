# Changelog

> 작성자: JunyoungJung
> 작성일: 2026-06-19

이 문서는 `codex-ultracode`의 사용자에게 보이는 변경 사항을 기록한다.

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
