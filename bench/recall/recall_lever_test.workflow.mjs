/**
 * recall-lever-test — reproduces bench/REPORT.md cycles 5–6 (the breadth-audit recall A/B).
 *
 * This is a Claude Code WORKFLOW script: it runs via the Workflow tool's primitives
 * (agent / parallel / phase), NOT as standalone `node`. Same base model in both arms;
 * only the orchestration differs:
 *   solo  = one agent audits the whole codebase in a single pass
 *   skill = fan-out (one searcher per 3-file group) + a completeness critic
 * Both are graded BLIND against the planted ground truth (fixtures/<name>.gt.json).
 *
 * Run from the repo root:
 *   Workflow({ scriptPath: "bench/recall/recall_lever_test.workflow.mjs" })
 *
 * Cycle 5 = the three fixtures below, run separately (this script).
 * Cycle 6 ("many files") = merge the three fixture dirs into one dir (filenames are
 *   unique across fixtures) and add a single {name, files:[all 24]} entry pointing at it.
 *   See bench/recall/README.md.
 */
export const meta = {
  name: 'recall-lever-test',
  description: 'Breadth-audit recall A/B: does fan-out + completeness beat a single pass? (reproduces REPORT cycles 5–6)',
  phases: [
    { title: 'Solo', detail: 'one exhaustive audit pass per fixture' },
    { title: 'Fanout', detail: 'split searchers + completeness critic' },
    { title: 'Grade', detail: 'blind recall vs planted ground truth' },
  ],
}

const BASE = 'bench/recall/fixtures'
const FIXTURES = [
  { name: 'utils',       files: ['auth.py','cache.py','config.py','csv_export.py','dates.py','money.py','pagination.py','parser.py','ratelimit.py'] },
  { name: 'http',        files: ['url.py','headers.py','resp.py','session.py','query.py','redirect.py','form.py'] },
  { name: 'collections', files: ['dedup.py','chunk.py','merge.py','topn.py','stats.py','flatten.py','groupby.py','sample.py'] },
]

const ISSUE_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['issues'],
  properties: { issues: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['file','symbol','type','description'],
    properties: { file:{type:'string'}, symbol:{type:'string'}, type:{type:'string'}, description:{type:'string'} } } } },
}
const GRADE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['matched_gt_ids','recall','n_found','false_positives','note'],
  properties: {
    matched_gt_ids: { type:'array', items:{type:'string'} },
    recall: { type:'number' }, n_found: { type:'integer' },
    false_positives: { type:'integer' }, note: { type:'string' },
  },
}

const auditInstr = (repo, files) =>
  `You are a meticulous code-review auditor. Read each of these files and find EVERY genuine defect — `+
  `correctness bugs, off-by-ones, missing validation, security issues, concurrency races, bad defaults. `+
  `Be EXHAUSTIVE: examine every function; do not stop after the obvious ones. For each issue return `+
  `{file, symbol (function/class), type, description}. Only report genuine defects, not style.\n\n`+
  `Files (read them at ${repo}/<name>): ${files.join(', ')}`

const gradePrompt = (gt, found) =>
  `You are a STRICT, IMPARTIAL grader. Read the ground-truth planted-bug list at ${gt} (each has id, file, `+
  `symbol, type, desc). Below is a list of issues some auditor FOUND. For EACH ground-truth bug, decide if `+
  `the found list contains a matching issue (same file AND same underlying defect; semantic match counts, `+
  `vague near-misses do NOT). Return matched_gt_ids (unique), recall = matched/total_gt, n_found, and `+
  `false_positives = found items matching NO ground-truth bug. Do not credit non-planted issues.\n\n`+
  `FOUND ISSUES:\n${JSON.stringify(found.issues, null, 1)}`

const rows = []
for (const fx of FIXTURES) {
  const repo = `${BASE}/${fx.name}`, gt = `${BASE}/${fx.name}.gt.json`, ALL = fx.files
  const GROUPS = []; for (let gi = 0; gi < ALL.length; gi += 3) GROUPS.push(ALL.slice(gi, gi + 3))

  phase('Solo')
  const solo = await agent(auditInstr(repo, ALL), { label: `solo:${fx.name}`, phase: 'Solo', schema: ISSUE_SCHEMA })

  phase('Fanout')
  const partials = (await parallel(GROUPS.map((g, i) => () =>
    agent(auditInstr(repo, g), { label: `find:${fx.name}:${i}`, phase: 'Fanout', schema: ISSUE_SCHEMA })
  ))).filter(Boolean)
  const merged = partials.flatMap(p => p.issues)
  const completeness = await agent(
    `You are a COMPLETENESS critic for a code audit of the codebase at ${repo} (files: ${ALL.join(', ')}). `+
    `Read every file and find GENUINE defects the searchers MISSED — especially functions with no reported `+
    `issue yet. Return ONLY additional missed issues. Style/robustness opinions are out of scope.\n\n`+
    `Already reported:\n${JSON.stringify(merged, null, 1)}`,
    { label: `complete:${fx.name}`, phase: 'Fanout', schema: ISSUE_SCHEMA })
  const skill = { issues: merged.concat(completeness.issues) }

  phase('Grade')
  const [gSolo, gSkill] = await parallel([
    () => agent(gradePrompt(gt, solo),  { label: `grade-solo:${fx.name}`,  phase: 'Grade', schema: GRADE_SCHEMA }),
    () => agent(gradePrompt(gt, skill), { label: `grade-skill:${fx.name}`, phase: 'Grade', schema: GRADE_SCHEMA }),
  ])
  rows.push({
    fixture: fx.name,
    solo:  { n_found: solo.issues.length,  recall: gSolo?.recall,  fp: gSolo?.false_positives },
    skill: { n_found: skill.issues.length, recall: gSkill?.recall, fp: gSkill?.false_positives },
  })
}
return { rows }
