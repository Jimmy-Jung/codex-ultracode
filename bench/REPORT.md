# Ultracode 플러그인 - 효과 측정 및 개선 (사이클 1)

**날짜:** 2026-06-27 · **하네스:** `bench/bench.py` (paired A/B, codex `solo` vs `ultracode`)

## 측정한 것

스킬은 컨텍스트 주입이다. `ultracode` 군은 스킬의 운영 규칙
(`SKILL.md`, frontmatter 제거)을 `codex exec` 프롬프트에 주입하고, `solo`는
순수 작업만 실행한다. 두 군 모두 격리된 일회용 git 클론에서 실행된다. 실행마다
두 가지 축을 본다.

- **목표 지표(objective)**: 패치 이후 **숨겨진** 테스트(에이전트에게 절대 보여주지 않음)가 통과하는가?
  보이는 테스트만 만족하는 임시방편 수정을 잡아낸다.
- **평가표(rubric)**: codex-as-judge가 diff를 1-5점으로 평가한다(정확성, 범위, 부수 효과, 근본 원인).
- **비용 대리 지표(cost proxy)**: wall-clock 경과 시간(동일 머신/모델; 토큰 캡처는 n/a, 주의사항 참고).

### 판별용 작업 모음 (`bench/tasks_disc/`)
| task | bug | visible은 통과하지만 hidden은 실패하는 임시방편 |
|---|---|---|
| roman | `to_roman` 테이블에 감산 표기 형식이 빠짐 | visible의 두 케이스만 하드코딩 |
| config | `parse_config`가 주석/엣지 케이스에서 crash | 한 번만 split하되 trim/empty/값 안의 `=` 처리를 생략 |
| paginate | 1-indexed page의 off-by-one | (대조군: 올바른 수정이 명확함) |

검증 결과: baseline에서는 visible 테스트가 실패하고(수정할 일이 있음), 시뮬레이션한
임시방편은 visible은 통과하지만 hidden 테스트는 실패한다(판별기가 작동함).

## 기준 결과 (현재 SKILL.md, 560줄)

| 군 | 해결 수(hidden) | 평가표 | ~경과 시간 |
|---|---|---|---|
| solo | **3/3 (1.000)** | 5.0 | **33s** |
| ultracode v1 | **3/3 (1.000)** | 5.0 | **233s** |

v1의 작업별 경과 시간: config 209s, paginate 246s, roman 245s.

**발견:** 이 작업 모음에서 560줄 스킬은 순수 codex 대비 정확성이나 품질 이득을
**전혀** 제공하지 않았고, wall-clock 비용은 **약 7배**였다. codex는 스킬 없이도
이 작업들을 올바르게 고칠 만큼 강했고 임시방편을 쓰지 않았다. 따라서 정확성 축은
포화되었고, 유일한 차별점은 비용인데 v1이 훨씬 나쁘다.

이는 연구 결과(`bench/research-synthesis.md` 참고)와 일치한다. 단순하고 의존성이
결합된 코딩에서는 최대 fan-out / "토큰 비용은 제약이 아니다"라는 접근이 정확성
없이 비용만 늘린다(Anthropic multi-agent 연구: 토큰 사용량이 비용 분산의 약 80%를
설명하며, 결합된 코딩에서는 multi-agent가 single-agent보다 성능이 낮음). 또한
560줄 스킬은 instruction adherence가 저하되는 Anthropic의 약 500줄 상한을 넘는다.

## 적용한 개선 (SKILL v2, 74줄)

근거 기반 재작성(`skills/ultracode/SKILL.v2.md`), 주요 변경 사항:
1. 태도: **"검증은 철저하게, fan-out은 가치 기준으로"**: 비용을 무시하지 않음.
2. 코딩의 기본 모드 = **실행 결과에 기반한 단일 루프**; 실제로 독립적인 breadth-first 작업에만 위임.
3. **강한 검증 게이트**: 주장은 실행한 명령 출력이 필요함; **수정 전 재현**;
   visible 증상이 아니라 **계약/근본 원인**을 수정.
4. **범위 울타리**: 대상만 변경; 추측성 hardening 금지; 존재하지 않는 dependency 환각 금지.
5. 비평자는 correctness에만 한정; adversarial round는 최대 2회.
6. 560줄 → **74줄** (progressive disclosure; 세부 사항은 `references/`로 이동).

## 개선 후 결과

| 군 | 해결 수(hidden) | 평가표 | ~경과 시간 |
|---|---|---|---|
| solo | 3/3 (1.000) | 5.0 | 33s |
| ultracode v1 (560 ln) | 3/3 (1.000) | 5.0 | 233s |
| **ultracode v2 (74 ln)** | **3/3 (1.000)** | **5.0** | **39s** |

v2의 작업별 경과 시간: config 33s, paginate 40s, roman 45s.

**개선: 동일한 정확성과 품질을 약 6배 낮은 비용으로 달성(233s → 39s, -83%),
모든 작업에서 일관됨(각각 5-7배 더 빠름).** v2는 거의 solo 속도(39s vs 33s)로
실행되면서, 더 어려운 작업에서 중요해질 검증 규율은 유지한다. v2는 `SKILL.md`로
승격되었다.

## 주의사항 (솔직한 한계)

- **N=3, 1회 반복** → 통계적으로 충분한 검정력이 없다. 하지만 v1→v2 비용 차이는
  크고 작업별로도 일관적이므로 방향성은 견고하다. 크기는 대략적인 값이다.
- **Correctness saturated**: codex가 모든 작업을 도움 없이 해결했기 때문에, v2의
  검증 규칙은 여기서 *정확성* 이득을 보여줄 수 없었다. 이득은 동일 정확성에서의
  효율성이다. 검증 규율이 정확성까지 끌어올리는지는 **더 어려운 작업**
  (Modal을 통한 SWE-bench Pro - `bench/README.md` 참고)이 필요하다.
- **Cost proxy = elapsed**; 토큰 캡처는 n/a를 반환했다(codex `--json` 필드 불일치,
  `_parse_tokens`). elapsed는 고정 머신/모델에서의 작업량을 추적한다.
- 이는 **하나의 codex 세션 안에서의 skill-content 주입**을 측정한 것이며, 실제
  subagent fan-out은 측정하지 않았다(`codex exec`는 single-session으로 실행됨).
  위임 태도 수정(#7/#9)은 이 하네스가 아니라 연구로 검증된다.

## 다음 사이클
- 더 어려운 샘플에서 SWE-bench Pro objective 축(Modal)을 실행해, v2의 검증 게이트가
  비용뿐 아니라 *정확성*도 끌어올리는지 테스트한다.
- `_parse_tokens`를 수정해 실제 토큰 delta를 보고하게 한다(elapsed보다 강한 비용 근거).

---

# 사이클 2 - v2의 검증 규율이 *정확성*을 높이는가? (더 어려운 작업)

**목표:** 정확성 격차를 찾는 것. 더 어려운 작업 4개(`bench/tasks_hard/`)를 만들었고,
그중 두 개는 강한 **임시방편 유도 작업**이다(partial-table `to_roman`,
`number_to_words` 0-999). 빠른 수정이 좁은 visible 테스트는 special-case로 만족시키되
일반 hidden 테스트는 실패할 수 있는 형태다. 검증 결과: 각 작업의 visible 테스트는
baseline에서 실패하고(수정할 일이 있음), 시뮬레이션한 임시방편은 visible은 통과하지만
hidden objective 테스트는 실패한다.

| 군 | 해결 수(hidden) | 평가표 | ~경과 시간 |
|---|---|---|---|
| solo | **4/4 (1.000)** | 5.0 | 37s |
| ultracode v2 | **4/4 (1.000)** | 5.0 | 48s |

작업별: roman2, num2words, intervals, brackets. **solo가 4개 모두 해결**했고,
임시방편 유도 작업도 포함된다. resolved-rate delta = +0.000, 95% CI [0,0].

**발견(솔직하게):** codex-solo는 유도 작업에서도 **임시방편을 쓰지 않았다**. 도움 없이
일반화하고 근본 원인을 수정했다. single-file, single-session local task에서는 정확성
축이 **포화**되어 있으므로, v2의 검증 규율은 여기서 *정확성* 이득을 보여줄 수 없다
(해는 없고, solo 대비 약 30% 시간 overhead가 있으며, 그래도 v1보다는 약 5배 낫다).

## 두 사이클의 결론
- **입증됨:** v2는 원래 SKILL 대비 실제 개선이다. **동일 정확성/품질에서 약 6배 낮은
  비용**(사이클 1). 원래의 560줄 "max fan-out, cost-blind" 스킬은 단순 코딩에서
  순수 codex보다 엄격히 나빴다.
- **로컬에서는 입증 불가:** 검증 규율로 인한 *정확성* 이득. codex-solo는 single-file
  작업에서 너무 강하다. 정확성 향상을 입증하려면 single-pass 역량을 넘어서는 작업이
  필요하다. 실제 **SWE-bench Pro**(multi-file, hours-long; Modal auth + cost 필요)
  및/또는 실제 **subagent fan-out**(플러그인이 의도한 host runtime; `codex exec`는
  single-session이라 이 하네스는 이를 실행할 수 없음).
- **종합:** 근거 기반 재작성은 올바른 선택이다. 측정된 큰 효율성 penalty를 품질 비용
  없이 제거했다. 정확성 가치 제안은 더 어렵고 fan-out이 가능한 경기장에서 검증해야 할
  가설로 남아 있다.

---

# 사이클 3 - 실제 SWE-bench Pro (Modal 채점, n=3)

**설정:** 공개 Pro instance 3개(NodeBB ×2, qutebrowser ×1; ansible은 크기 때문에 제외).
codex가 실제 repo에서 양쪽 군의 패치를 생성했다(base_commit의 host clone). 패치는
**공식 Scale 하네스 `swe_bench_pro_eval.py`를 Modal cloud에서 실행**해 채점했다
(`jefzda/sweap-images` x86 컨테이너를 pull하고, 각 repo의 실제 FAIL_TO_PASS/PASS_TO_PASS 실행).
필요했던 integration fix: CSV는 `repo`(owner/name)와 소문자 `fail_to_pass`/`pass_to_pass`
컬럼을 요구했다(하네스 docstring과 code가 불일치). patch JSON `{instance_id,patch,prefix}`는 일치했다.

| 인스턴스 | solo | ultracode v2 |
|---|---|---|
| NodeBB-0499… | resolved | resolved |
| qutebrowser-c580… | resolved | resolved |
| NodeBB-51d8… | failed | failed |
| **resolved** | **2/3 (66.7%)** | **2/3 (66.7%)** |

생성 비용(elapsed): solo는 instance당 약 260s, v2는 instance당 약 335s. Rubric: solo 2.33, v2 2.67.

**발견:** 실제 SWE-bench Pro에서 v2와 순수 codex는 **같은** 2/3을 해결했다. 동일한
instance가 통과하고 동일한 하나가 실패했다. n=3에서 **정확성 차이는 없음**(그리고 n=3은
어떤 통계적 주장에도 너무 작다. CI가 거의 전체 범위를 덮는다). 두 군 모두 같은
instance에서 실패했다(둘 다 rubric 1의 나쁜 patch). 이는 해당 instance가 스킬과 무관하게
single-pass `codex exec`의 범위를 넘어섰음을 시사한다.

## 전체 판정 (3개 사이클)
- **입증 및 적용 완료:** v2 SKILL은 실제 개선이다. 원래 560줄 스킬 대비 **동일 품질에서
  약 6배 낮은 비용**(사이클 1)을 보였고, 표준 평가셋인 SWE-bench Pro에서도 **정확성
  회귀 없음**이 확인되었다(사이클 3: v2는 순수 codex와 동일하게 2/3).
- **입증되지 않음:** 스킬로 인한 정확성 *우위*. 로컬 easy(사이클 1), 로컬 hard
  임시방편 유도 작업(사이클 2), 실제 Pro(사이클 3) 전체에서 v2는 정확성에서 solo를
  이긴 적이 없고 동률이다. 검증 규율의 효과는 효율성 + 무회귀로 나타났지, 아직 더 높은
  resolve rate로 나타나지는 않았다.
- **왜 여기서는 정확성 우위에 도달하기 어려울 수 있는가:** `codex exec`는 single-session으로
  실행되므로, 스킬의 진짜 레버(독립 subagent fan-out + adversarial verification)가 전혀
  사용되지 않는다. 주입되는 것은 운영 *규칙*인데, 강한 단일 모델은 이미 그 대부분을 따른다.
  fan-out 레버를 테스트하려면 실제로 subagent를 생성하는 host(플러그인이 의도한 Claude Code /
  Codex `spawn_agent` runtime)와, 통계적 검정력을 위한 더 큰 Pro 표본이 필요하다.

---

# 사이클 3b - SWE-bench Pro를 n=12로 확장 (Modal 채점)

8개 repo(NodeBB, navidrome, ansible×2, protonmail/webclients×2, openlibrary×3,
flipt, qutebrowser, tutanota)에 걸친 Pro instance 12개의 strided sample을 사용했다.
두 군 모두 실제 repo에서 codex가 생성했고, Modal에서 공식 Scale 하네스로 채점했다.

| 지표 | solo | ultracode v2 |
|---|---|---|
| **해결 수(resolved)** | **3/12 (25.0%)** | **3/12 (25.0%)** |
| 해결된 instance | NodeBB-04998908, qutebrowser-c580…(34a13), openlibrary-92db3454 | **동일** |
| 평가표(rubric, n=10 patched) | 3.00 | 2.90 |
| 생성 경과 시간/instance | ~286s | ~333s |

해결률 차이(resolved-rate delta) = **+0.000, 95% CI [0, 0]**. 평균만 같은 것이 아니라,
**양쪽 군에서 정확히 같은 instance가 통과하고 실패했다**. ansible instance 2개는
420초 cap 안에서 양쪽 군 모두 빈 patch를 생성했으므로 대칭적으로 제외했다.

**발견:** 표준 평가셋인 SWE-bench Pro n=12에서 v2와 순수 codex는 **정확성 측면에서
구분되지 않는다**. instance별 결과가 완전히 일치했다. single-session `codex exec`에서는
검증 규율이 resolve rate를 높이지도 낮추지도 않았다.

## 최종 판정 (사이클 1-3b)

| 주장 | 상태 | 근거 |
|---|---|---|
| v2는 동일 품질에서 원래 560줄 스킬보다 비용이 낮다 | **입증됨** | 사이클 1: 약 6배 빠름(39s vs 233s), 3/3 vs 3/3 |
| v2는 정확성을 회귀시키지 않는다 | **표준 평가셋에서 입증됨** | 사이클 3b: SWE-bench Pro n=12, 3/12 == 3/12, 동일 instance |
| v2는 순수 codex보다 정확성을 높인다 | **근거 없음** | 모든 곳에서 동률(local easy, local hard, Pro n=3, Pro n=12) |

**결론:** 근거 기반 재작성(560→74줄, "검증 기반, 가치 기준 fan-out")은 올바른 변경이다.
측정된 약 6배 효율성 penalty를 제거했고, 실제 SWE-bench Pro에서 **정확성 비용이 없다는
점도 확인했다**. 다만 이 하네스에서는 스킬로 인한 정확성 *향상*을 뒷받침하지 못한다.
`codex exec`가 single-session으로 실행되기 때문에 스킬의 실제 레버인 독립 subagent fan-out과
adversarial verification이 전혀 실행되지 않는다. 운영 *규칙*만 주입하는 것으로는 강한 단일
모델의 결과를 바꾸지 못했다. 그 레버를 테스트하려면 실제로 subagent를 생성하는 host와,
통계적 검정력을 갖춘 더 큰 Pro 표본이 필요하다.

---

# 사이클 4 - 실제 멀티에이전트 레버(`orch` arm)가 *정확성*을 높이는가? (Modal 실채점)

**배경:** 사이클 1–3b는 스킬을 *컨텍스트 주입*으로만 측정했다(`codex exec` single-session).
스킬의 진짜 레버(서브에이전트 팬아웃 + 독립 적대적 검증 + best-of-N)는 발동되지 않았다.
사이클 4는 그 레버를 **실제 codex 서브프로세스로** 발동시키는 `orch` arm을 새로 만들어,
SWE-bench Pro n=12에서 정확성 우위가 나오는지 직접 실측했다.

## 레버 빌드 전: 가설을 적대적으로 검증 (싸게)

"confident-wrong 실패(flipt/navidrome/tutanota/webclients-0200)는 명세 위반이므로
verify→repair로 전환 가능"이라는 가설을 세우고, **빌드 전에** 적대적 검증 패널(4 인스턴스,
회의적 검증자)로 반증을 시도했다.

- 패널 판정: spec-observable 위반 **1/4**(flipt만, 신뢰도 0.55).
- **flipt ground truth 대조**(데이터셋 gold patch + hidden test): hidden 테스트는
  `assert.EqualError(err, "unsupported version: 5.0")`처럼 **에러 문자열 바이트 일치**를
  요구한다. 실패 패치는 의미는 맞지만 다른 문구(`"unsupported document version %q..."`)를
  써서 실패했다. 문제 명세는 정확한 문구를 주지 않는다(**held-out 정보**). 또한
  `interface{}` vs `ImportOpt`는 상위집합이라 컴파일·통과되는 **red herring**이었다.
- **결론:** Pro 실패는 명세 위반이 아니라 held-out 정보(정확 에러 문자열·테스트 fixture·
  명세가 고정 안 한 행동 해석) 때문이다. 따라서 어떤 오케스트레이션 레버도 *없는 정보*를
  복원할 수 없다. → 그럼에도 "null을 실측으로 확정"하기 위해 레버를 빌드해 채점했다.

## orch arm (이 사이클에서 구현)

`bench/orch.py`: best-of-N 후보 생성(독립 codex 프로세스) → 각 후보를 독립 적대적
검증(codex read-only + 구조화 스키마, 명세·암시 계약 위반 나열) → 위반 최소 후보 선택 →
repair(위반만 국소 수정). base 모델 = codex 고정(solo와 깨끗한 A/B). candidate 0은 solo
패치로 **시딩**(무회귀 가드). 다양성 nudge가 held-out 관심사(정확 문구·엣지케이스)를
정조준해 레버에 **최선의 기회**를 부여(공정한 null). N=3, 600s 캡.

## 결과 (Modal 공식 하니스 실채점, n=12)

| 지표 | solo (사이클 3b) | **orch (사이클 4)** |
|---|---|---|
| **resolved** | **3/12 (25.0%)** | **3/12 (25.0%)** |
| 해결 instance | NodeBB-04998908, openlibrary-92db3454, qutebrowser-34a13 | **완전히 동일** |
| 회귀(solo PASS→fail) | — | **0** |
| 신규 전환(solo fail→PASS) | — | **0** |
| 생성 비용/instance | codex 1회 | codex 5~8회(생성3+검증3+repair) |

confident-wrong 4개(flipt·navidrome·tutanota·webclients-0200)는 best-of-3 + 적대적 검증 +
repair에도 **전부 여전히 실패**. repair가 시딩된 정답(NodeBB)을 깨지도 않았다(무회귀 가드 작동).

**발견:** 실제 레버를 발동시켜도 정확성은 **단일 패스 solo와 정확히 동률**이며, instance별
결과도 완전히 일치한다. ground truth가 예측한 그대로다 — held-out 정보는 팬아웃·적대적
검증·best-of-N 어느 것으로도 복원되지 않는다. 비용만 5~8배 더 들었다.

## 최종 판정 (사이클 1–4)

| 주장 | 상태 | 근거 |
|---|---|---|
| v2는 동일 품질에서 원본(560줄)보다 6배 저렴 | **입증** | 사이클 1 |
| v2는 정확성을 회귀시키지 않는다 | **입증** | 사이클 3b: Pro n=12, 3/12==3/12 |
| 스킬(규칙 주입)이 Pro 정확성을 높인다 | **반증** | 사이클 1–3b: 전 구간 동률 |
| **실제 멀티에이전트 레버가 Pro 정확성을 높인다** | **반증(실측)** | **사이클 4: orch 3/12 == solo 3/12, 동일 instance, 전환 0** |

**결론:** ultracode의 가치(검증 규율·완전성·과신 차단)는 **SWE-bench Pro가 측정하는 축과
다르다(계측기 불일치)**. Pro 실패는 held-out 정보 추측 문제이고, 이는 오케스트레이션이
고치는 실패 모드(과신 band-aid·breadth-first 누락·무규율)가 아니다. 이는 ultracode의 결함이
아니라 벤치마크-가치 불일치다. 정직한 결론: **검증된 승리(6배 저렴·무회귀)를 출시하고,
정확도 우위는 레버가 실제로 먹히는 아레나(주입 결함 감사·완전성 recall·유효 selector가
있는 best-of-N)에서 측정해야 한다 — Pro에서는 아니다.**

---

# 사이클 5 - 스킬 레버가 *어디서* 효과를 내는가: 전수 결함 감사 recall (로컬, 3 코드베이스)

**배경:** 사이클 4까지는 SWE-bench Pro(단일 응집 수정)에서만 측정 → 전 구간 동률. 가설: 스킬의
fan-out 레버는 Pro가 측정하지 않는 *breadth-first 완전성*에서 효과를 낸다. 이를 직접 검증했다.

**설정:** 같은 모델(Claude) A/B. solo = 1 에이전트가 코드베이스 전체를 1회 감사. skill = 파일을
분할해 3 서브에이전트 팬아웃 + 완전성 비평. 결함을 심은 3개 코드베이스(일반 utils / http·web /
collections), 총 46개 심은 버그. 채점 = blind 채점자가 발견분을 ground truth에 매칭 → recall + 거짓양성(FP).

| 코드베이스 | solo recall | solo FP | skill recall | skill FP |
|---|---|---|---|---|
| utils (미묘한 버그) | 15/18 | 5 | 17/18 | 16 |
| http/web (명백한 보안버그) | 14/14 | 0 | 14/14 | 8 |
| collections (혼합) | 13/14 | 0 | 14/14 | 4 |
| **합계** | **42/46 (91.3%)** | **5** | **45/46 (97.8%)** | **28** |

**발견:** 팬아웃 레버는 recall을 **91.3%→97.8% (+3버그)**로 올렸다 — 방향은 일관(skill ≥ solo 전
시행). 단 효과는 *조건부*다: 버그가 미묘해 단일 패스가 satisfice할 때만 이득(utils·collections),
명백한 버그(http 보안)엔 solo가 이미 완벽 → 이득 0. 그리고 **거짓양성이 5→28 (5.6배)로 모든
시행에서 일관 폭증** — 완전성 비평이 noise를 양산("비평가가 문제를 지어낸다"의 정량화). F1로는
보통 solo가 우위.

**판정:** 스킬은 무의미하지 않다 — 단 **"하나도 놓치면 안 되는 전수 감사"** 도구다. recall이 생명이고
FP triage가 감당되는 고위험 완전성 작업에서 가치가 있고, "깔끔한 실행 목록"이 목적이면 precision
비용이 역효과다. 이는 "이점은 작업 종류로 층화해야 보인다"(README 이점·비용)와 SKILL의 "가치 비례
팬아웃"을 실측으로 뒷받침한다. SKILL은 이에 따라 breadth 팬아웃 발견을 보고 전 적대 검증으로
거짓양성을 거르도록 강화됐다.

**주의:** N=3 코드베이스, 시행당 14~18 버그, 단일 회차 → directional. 절대 마진(+3/46)은 작다.

---

# 사이클 6 - "파일이 많을 때" fan-out 이점이 커지는가? (24파일 통합 감사, 가설 반증)

**가설:** 파일 수가 늘면 단일 패스가 더 satisfice → fan-out 이점이 커진다. 검증을 위해 사이클 5의
3개 코드베이스(검증된 버그 46개)를 **24파일 단일 코드베이스(총 188줄)**로 합쳐 solo(24개 한 번에
감사) vs 팬아웃(8그룹) 비교(같은 모델, blind 채점).

| 지표 | solo | skill(팬아웃) |
|---|---|---|
| recall | 43/46 (93.5%) | 44/46 (95.7%) |
| 찾은 수(n_found) | 46 | 72 |
| 거짓양성(FP) | 6 | 10 |

resolved delta = **+1버그(+2.2%p)**.

**발견(가설 반증):** 파일을 9→24개로 늘려도 fan-out 이점은 커지지 않고 오히려 **노이즈 수준(+1버그)으로
축소**됐다(사이클 5 분리 측정은 +3버그). solo recall도 91.3→93.5%로 비슷(LLM 비결정성 범위 내). 한편
skill은 72개를 보고(solo 46), FP 10(solo 6) — **precision 비용은 규모가 커져도 지속**됐다.

**해석:** 총량이 188줄로 작아 24파일도 한 컨텍스트에 다 들어가므로 "파일 수"만으로는 단일 패스가 무너지지
않는다. fan-out의 recall 이점(~+1–3버그)과 precision 비용(~2배 FP)은 규모와 무관한 **안정적 속성**으로
보이며, "파일이 많을수록 유리"는 이 크기대에서 성립하지 않았다. 진짜 이점이 예상되는 "한 컨텍스트를 넘는
대규모"(수만 줄)는 본 하니스로 **미측정**으로 남는다(차용한 원리상 유리, 자체 측정 필요).

---

# 부록 — 측정 설정 (모델·effort·채점)

- **사이클 1–4 (SWE-bench Pro A/B):** base = codex CLI 0.133.0. 모델·reasoning effort를 하니스(`bench/bench.py`, `bench/orch.py`)에서 **고정하지 않음** → codex 기본값(문서상 medium) 사용. `approval_policy="never"`, `workspace-write`, 생성 타임아웃 420–600초. 채점 = Modal에서 공식 Scale 하니스 `swe_bench_pro_eval.py`(`jefzda` 이미지), resolved = FAIL_TO_PASS ∪ PASS_TO_PASS 전부 통과.
- **사이클 5–6 (전수 감사 recall):** 양 arm 모두 Claude Opus 4.8(세션 모델), effort = xhigh(세션 `/effort ultracode`; 워크플로 서브에이전트가 메인 루프 모델·effort 상속). 별도 에이전트 blind 채점.
- **Pro 해결 인스턴스 (3/12, solo·orch 동일):** NodeBB-04998908(js), internetarchive/openlibrary-92db3454(py), qutebrowser-34a13afd(py). 실패 9 + ansible 2(빈 패치, 대칭 제외).
- 데이터셋 `ScaleAI/SWE-bench_Pro` test, strided n=12. 감사 픽스처 `bench/recall/fixtures/`.

---

# 사이클 7 - "진짜 대규모/컨텍스트 초과" regime: 부피가 커지면 fan-out 이점이 폭증하는가? (확인됨)

사이클 6은 파일 수만 늘렸고(24파일·188줄) 이점이 안 커졌다. 사이클 7은 같은 46버그를 파일당 약 560줄
clean filler(trivially-correct 헬퍼)로 묻어 **24파일·13,460줄(약 107K 토큰)** 코드베이스로 키워 측정했다
(같은 모델 Opus 4.8/xhigh, solo 1패스 vs 팬아웃 8그룹+완전성, blind 채점).

| 지표 | solo | skill(팬아웃) |
|---|---|---|
| recall | 32/46 (69.6%) | 44/46 (95.7%) |
| 찾은 수(n_found) | 33 | 60 |
| 거짓양성(FP) | 2 | 13 |

resolved delta = **+12버그(+26.1%p)** — 전 사이클 최대.

**발견(가설 확인):** 부피가 188줄→13,460줄로 커지자 **solo recall이 91–93%에서 69.6%로 붕괴**한 반면
팬아웃은 95.7%를 유지했다. 이점이 +1~6.5버그(소형)에서 **+12버그**로 폭증했다. 단일 패스는 약 107K
토큰의 코드를 한 번에 훑으며 satisfice → 큰 파일에 묻힌 버그를 대량 누락하는데, 팬아웃은 각 에이전트가
약 1,680줄만 깊게 봐서 recall을 유지한다.

**핵심 구분(사이클 6 vs 7):** fan-out 이점을 키우는 변수는 **"파일 수"가 아니라 "부피(코드 양)"** 다.
24개 작은 파일(188줄)에서는 이점이 노이즈였지만, 같은 24파일을 13,460줄로 키우자 이점이 폭증했다.

**정직한 한계:** 107K 토큰은 크지만 Opus 컨텍스트 창(200K+) 안이라 "하드 윈도 초과"는 아니다 — 모델이
다 읽을 수는 있으나 큰 부피에서 주의가 분산됐다. 추세(188줄 +1버그 → 13,460줄 +12버그)는 "부피가
클수록 fan-out 우위가 커진다"를 강하게 지지하며, 진짜 윈도 초과(>200K 토큰)에서는 더 벌어질 것으로 예상된다.
