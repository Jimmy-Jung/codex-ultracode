# Handoff — codex ultracode 효과 측정 (이어가기)

정식 기록은 `bench/REPORT.md`(사이클 1–6 + 부록), README "왜 ultracode를 쓰는가".
브랜치 `feature/benchmark`. 커밋 7개 완료.

## IN-FLIGHT (이 세션 백그라운드 — 하네스 추적/통지)

### Part A — effort 매트릭스 (medium/high/xhigh × solo/ultracode, SWE-bench Pro n=12)
- medium = 기존 `results_pro12.json`(solo 3/12 == ultracode 3/12, Modal 채점됨). 재활용.
- high  생성 RUNNING → `bench/results_high.json` (log run_high.log). task=b3r8vyp0n.
- xhigh 생성 RUNNING → `bench/results_xhigh.json` (log run_xhigh.log). task=bix7f236o.
- bench.py에 `BENCH_EFFORT` env 노브 추가(`-c model_reasoning_effort=`). `--arm both`.
- 완료 후: `swebench_pro.py export-preds --results results_<eff>.json --out preds_<eff>`
  → Modal 채점 → 매트릭스(3 effort × 2 arm) 표를 README "벤치마크 상세" + REPORT에 추가.

### Part B — "진짜 컨텍스트 초과" regime recall A/B
- 코드베이스 `scratchpad/audit_repo_xl`(24파일·13,460줄·~107K토큰, 46버그; 패딩=trivially-correct 헬퍼).
- recall 워크플로 RUNNING(task=wmyfek8al, run=wf_f18a3658): solo vs 팬아웃+완전성, blind 채점.
- 완료 후: solo recall이 사이클 5–6(91–93%) 대비 무너지는지 확인 → REPORT 사이클 7 +
  README 표 "진짜 대규모" 행을 실측으로 갱신(현재 "미측정").

## Modal 채점 레시피
- Scale 하니스: scratchpad/SWE-bench_Pro-os. venv: bench/.venv.
- CSV: scratchpad/swe_bench_pro_12_full.csv (데이터셋 전 컬럼; before_repo_set_cmd 필수, f2p/p2p 소문자).
- 명령: cd scratchpad/SWE-bench_Pro-os && <venv>/python swe_bench_pro_eval.py
  --raw_sample_path=<csv> --patch_path=<abs preds_<eff>/<arm>.json --output_dir=scratchpad/out_<eff>_<arm>
  --scripts_dir=run_scripts --num_workers=8 --dockerhub_username=jefzda → eval_results.json={id:bool}.

## 재현 자산 (커밋됨)
- bench/recall/: fixtures(46버그) + recall_lever_test.workflow.mjs + README. 사이클 5–6 재현.

## 함정
- GateGuard: Write/Edit·rm·`>`마다 사실확인 게이트 → heredoc. rm -rf 대신 고유 디렉토리명.
- 워크플로 args는 scriptPath 모드에서 전달 안 됨 → 하드코딩.
- 한글 볼드: 닫는 ** 앞이 %/→/) + 뒤 한글이면 깨짐 → 볼드는 한글 글자로 끝내기.

## (업데이트) Part A 재시작 — 토큰 캡처 포함, 3 effort 전부
- `_parse_tokens` 수정 커밋됨(codex usage 합산). 레코드에 `usage`{input,output,reasoning,total} 포함.
- 재생성 RUNNING (토큰 포함): medium=bvk33ply9 → results_medium.json, high=b220xpp1l → results_high.json, xhigh=b04el4x8v → results_xhigh.json. 각 `--arm both`, tasks_pro12.
- 완료 후: export-preds(eff별) → Modal 채점 6 pred set → 매트릭스(3 effort × 2 arm)에 **resolved + 평균 토큰(solo vs ultracode 차이)** 표를 README/REPORT에 추가.
- Part B(컨텍스트 초과, 사이클 7) 완료·커밋됨(ec979ba). 워크플로 telemetry상 XL recall run subagent_tokens≈725K(양 arm+채점 합).

## (업데이트2) effort 매트릭스 — 순차+ansible 제외로 재실행
- 3회 연속 kill 원인 = 동시 3개 + ansible 대용량 클론 과부하. 해결: `tasks_pro10`(ansible 2개 제외) + **순차 루프**(단일 백그라운드 task=b35n991o2, medium→high→xhigh).
- 출력: results_{medium,high,xhigh}.json (각 10인스턴스×2arm=20런, usage 토큰 포함). log: run_eff_seq.log.
- 토큰 차이는 부분 데이터로 이미 확인: ultracode/solo total 배수 medium 1.29×, high 1.61×, xhigh 2.01×(공통 인스턴스 paired).
- 완료 후: export-preds(eff별) → Modal 채점 6 pred set → README/REPORT에 3 effort × 2 arm 매트릭스(resolved + 평균 토큰) 추가.
