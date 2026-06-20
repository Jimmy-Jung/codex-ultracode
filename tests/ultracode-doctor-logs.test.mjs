// Author: JunyoungJung
// Date: 2026-06-21

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");
const doctorScript = path.join(repoRoot, "scripts", "ultracode-doctor-logs.mjs");

function makeTempLogRoot(t) {
  const logRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ultracode-doctor-"));
  t.after(() => {
    fs.rmSync(logRoot, { recursive: true, force: true });
  });
  return logRoot;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function baseMetrics({ runId, root, status = "complete", version = "0.2.2" }) {
  return {
    schema_version: 1,
    run_id: runId,
    slug: runId,
    workspace_key: "test-workspace",
    created_at: "2026-06-20T00:00:00Z",
    completed_at: status === "complete" ? "2026-06-20T00:01:00Z" : null,
    status,
    mode: "delegated",
    risk_level: "medium",
    objective_kind: "qa",
    artifact_root: root,
    summary_record_path: path.join(path.dirname(path.dirname(root)), "summary.jsonl"),
    plugin: {
      name: "codex-ultracode",
      version,
      manifest_path: path.join(root, ".codex-plugin", "plugin.json"),
    },
    host: {
      codex_version: "codex-cli test",
      interface: "cli",
      platform: "darwin",
      sandbox_mode: "danger-full-access",
      approval_policy: "never",
      native_subagent_available: true,
      review_surface_available: true,
      mcp_available: true,
    },
    invocation: {
      entrypoint: "explicit_skill",
      prompt_clarity: "clear",
      clarification_asked: false,
      target_inferred: false,
      raw_prompt_logged: false,
    },
    capabilities: {
      diff_checked: true,
      review_run: true,
      status_checked: true,
      mcp_checked: true,
      fresh_session_smoke_ran: false,
      skip_reasons: [],
    },
    safety: {
      write_permission_confirmed: false,
      approval_gates_triggered: [],
      external_action_requested: false,
      external_action_blocked: false,
    },
    delegation: {
      native_agent_used: true,
      agent_count: 1,
      wave_count: 1,
      fan_out_shape: "parallel",
      agent_failures: 0,
      agent_timeouts: 0,
    },
    packets: {
      total: 1,
      complete: status === "complete" ? 1 : 0,
      blocked: 0,
      skipped: 0,
      timeout: 0,
    },
    verification: {
      checks_total: 1,
      checks_pass: status === "complete" ? 1 : 0,
      checks_fail: 0,
      checks_skipped: 0,
      checks_timeout: 0,
      tests_total: null,
      tests_passed: null,
      tests_failed: null,
    },
    review: {
      reviewer_agents: 1,
      findings_total: 0,
      findings_accepted: 0,
      findings_rejected: 0,
      timeout_attempts: 0,
      eventual_pass_after_timeout: false,
    },
    token_usage: {
      available: false,
      source: null,
      input_tokens: null,
      output_tokens: null,
      cached_input_tokens: null,
      total_tokens: null,
    },
    timing: {
      available: false,
      elapsed_ms: null,
    },
    outcome: {
      changed_files_count: 0,
      completed_user_goal: status === "complete",
      residual_risk_count: 0,
      skipped_required_checks: 0,
    },
    failure: {
      primary_phase: "none",
      category: "none",
      retry_count: 0,
      blocked_reason: "",
    },
    artifact_health: {
      artifact_write_ok: true,
      summary_append_ok: true,
      schema_validation_ok: null,
    },
    revision: {
      git_commit: "testsha",
      worktree_dirty: false,
      skill_manifest_version: version,
    },
    notes: "",
  };
}

function writeRun(logRoot, runId, overrides = {}) {
  const root = path.join(logRoot, "test-workspace", runId);
  const metrics = {
    ...baseMetrics({
      runId,
      root,
      status: overrides.status ?? "complete",
      version: overrides.version ?? "0.2.2",
    }),
    ...overrides.metrics,
  };
  const state = {
    title: runId,
    slug: runId,
    run_id: runId,
    created_at: "2026-06-20T00:00:00Z",
    updated_at: "2026-06-20T00:01:00Z",
    status: metrics.status,
    mode: metrics.mode,
    baseline_ref: "testsha",
    risk_level: metrics.risk_level,
    eval_contract: { level: "inline", path: null, status: "checked" },
    approval: { required: false, granted: null, notes: "" },
    delegation: {
      native_agent_available: true,
      native_agent_planned: true,
      native_agent_used: true,
      runtime: "spawn_agent",
      agent_count: 1,
      wave_count: 1,
      fan_out_shape: "parallel",
      no_delegation_reason: "",
      notes: "",
    },
    codex_checkpoints: {},
    agents: [],
    agent_isolation_policy: { required_for_parallel_writes: false, notes: "" },
    packets: [],
    verification: { status: "pass", checks: [] },
  };

  for (const name of ["plan.md", "orchestration.md", "integration.md", "final-report.md"]) {
    writeText(path.join(root, name), `# ${name}\n`);
  }
  writeJson(path.join(root, "state.json"), state);
  writeJson(path.join(root, "metrics.json"), metrics);
  return { root, metrics };
}

function appendSummary(logRoot, record) {
  fs.appendFileSync(path.join(logRoot, "summary.jsonl"), `${JSON.stringify(record)}\n`);
}

function runDoctor(args, options = {}) {
  const result = spawnSync(process.execPath, [doctorScript, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    ...options,
  });
  return {
    ...result,
    json: result.stdout ? JSON.parse(result.stdout) : null,
  };
}

test("--terminal-only excludes non-terminal metrics from validation", (t) => {
  const logRoot = makeTempLogRoot(t);
  writeText(path.join(logRoot, "summary.jsonl"), "");
  const { metrics } = writeRun(logRoot, "executing-run", {
    status: "executing",
    version: "0.2.2",
    metrics: {
      artifact_health: {
        artifact_write_ok: true,
        summary_append_ok: false,
        schema_validation_ok: null,
      },
    },
  });

  assert.equal(metrics.status, "executing");

  const result = runDoctor([
    "--log-root",
    logRoot,
    "--plugin-version",
    "0.2.2",
    "--terminal-only",
    "--json",
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.json.metrics_checked, 0);
  assert.equal(result.json.terminal_metrics_checked, 0);
  assert.equal(result.json.nonterminal_metrics_skipped, 1);
  assert.deepEqual(result.json.issues, []);
});

test("reports warning counts by code for 0.2.1 finalization gaps", (t) => {
  const logRoot = makeTempLogRoot(t);
  const { root, metrics } = writeRun(logRoot, "bad-finalization", {
    version: "0.2.1",
    metrics: {
      artifact_health: {
        artifact_write_ok: true,
        summary_append_ok: false,
        schema_validation_ok: null,
      },
    },
  });
  appendSummary(logRoot, {
    schema_version: 1,
    run_id: metrics.run_id,
    slug: metrics.slug,
    workspace_key: metrics.workspace_key,
    completed_at: metrics.completed_at,
    status: "complete",
    mode: metrics.mode,
    risk_level: metrics.risk_level,
    objective_kind: metrics.objective_kind,
    artifact_root: root,
  });

  const result = runDoctor([
    "--log-root",
    logRoot,
    "--plugin-version",
    "0.2.1",
    "--fail-on",
    "warning",
    "--json",
  ]);

  assert.equal(result.status, 1);
  assert.equal(result.json.counts.error, 0);
  assert.equal(result.json.counts.warning, 3);
  assert.equal(result.json.warnings_by_code.summary_plugin_metadata_missing, 2);
  assert.equal(result.json.warnings_by_code.terminal_summary_append_unconfirmed, 1);
  assert.equal(result.json.terminal_metrics_checked, 1);
  assert.equal(result.json.nonterminal_metrics_checked, 0);
});

test("uses version-aware metrics fields for 0.2.0 logs", (t) => {
  const logRoot = makeTempLogRoot(t);
  const { root, metrics } = writeRun(logRoot, "legacy-0-2-0", {
    version: "0.2.0",
  });
  const metricsWithoutNewReviewFields = {
    ...metrics,
    review: Object.fromEntries(
      Object.entries(metrics.review).filter(
        ([key]) => !["timeout_attempts", "eventual_pass_after_timeout"].includes(key),
      ),
    ),
  };
  writeJson(path.join(root, "metrics.json"), metricsWithoutNewReviewFields);
  appendSummary(logRoot, {
    schema_version: 1,
    run_id: metrics.run_id,
    slug: metrics.slug,
    workspace_key: metrics.workspace_key,
    completed_at: metrics.completed_at,
    status: "complete",
    mode: metrics.mode,
    risk_level: metrics.risk_level,
    objective_kind: metrics.objective_kind,
    plugin_name: "codex-ultracode",
    plugin_version: "0.2.0",
    artifact_root: root,
  });

  const result = runDoctor([
    "--log-root",
    logRoot,
    "--plugin-version",
    "0.2.0",
    "--json",
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.json.counts.error, 0);
  assert.equal(result.json.counts.warning, 0);
  assert.equal(result.json.metrics_checked, 1);
});
