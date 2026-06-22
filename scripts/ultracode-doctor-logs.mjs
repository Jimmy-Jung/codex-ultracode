#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const RUN_STATUSES = new Set([
  "planning",
  "waiting_for_approval",
  "executing",
  "integrating",
  "verifying",
  "complete",
  "blocked",
  "cancelled",
]);

const TERMINAL_STATUSES = new Set(["complete", "blocked", "cancelled"]);
const MODES = new Set(["direct", "workflow", "delegated"]);
const RISK_LEVELS = new Set(["low", "medium", "high", "unknown"]);
const OBJECTIVE_KINDS = new Set([
  "debug",
  "implementation",
  "review",
  "docs",
  "research",
  "migration",
  "qa",
  "other",
]);
const FAILURE_CATEGORIES = new Set([
  "none",
  "timeout",
  "tool_unavailable",
  "test_failure",
  "permission",
  "ambiguous_request",
  "conflict",
  "schema_error",
  "unknown",
]);
const FINALIZATION_WARNING_MIN_VERSION = "0.2.1";

const REQUIRED_ARTIFACTS = [
  "plan.md",
  "orchestration.md",
  "state.json",
  "metrics.json",
  "integration.md",
  "final-report.md",
];

const REQUIRED_METRICS_PATHS = [
  "schema_version",
  "run_id",
  "slug",
  "workspace_key",
  "created_at",
  "completed_at",
  "status",
  "mode",
  "risk_level",
  "objective_kind",
  "artifact_root",
  "summary_record_path",
  "plugin.name",
  "plugin.version",
  "plugin.manifest_path",
  "host.codex_version",
  "host.interface",
  "host.platform",
  "host.sandbox_mode",
  "host.approval_policy",
  "host.native_subagent_available",
  "host.review_surface_available",
  "host.mcp_available",
  "invocation.entrypoint",
  "invocation.prompt_clarity",
  "invocation.clarification_asked",
  "invocation.target_inferred",
  "invocation.raw_prompt_logged",
  "capabilities.diff_checked",
  "capabilities.review_run",
  "capabilities.status_checked",
  "capabilities.mcp_checked",
  "capabilities.fresh_session_smoke_ran",
  "capabilities.skip_reasons",
  "safety.write_permission_confirmed",
  "safety.approval_gates_triggered",
  "safety.external_action_requested",
  "safety.external_action_blocked",
  "delegation.native_agent_used",
  "delegation.agent_count",
  "delegation.wave_count",
  "delegation.fan_out_shape",
  "delegation.agent_failures",
  "delegation.agent_timeouts",
  "packets.total",
  "packets.complete",
  "packets.blocked",
  "packets.skipped",
  "packets.timeout",
  "verification.checks_total",
  "verification.checks_pass",
  "verification.checks_fail",
  "verification.checks_skipped",
  "verification.checks_timeout",
  "verification.tests_total",
  "verification.tests_passed",
  "verification.tests_failed",
  "review.reviewer_agents",
  "review.findings_total",
  "review.findings_accepted",
  "review.findings_rejected",
  "review.timeout_attempts",
  "review.eventual_pass_after_timeout",
  "token_usage.available",
  "token_usage.source",
  "token_usage.input_tokens",
  "token_usage.output_tokens",
  "token_usage.cached_input_tokens",
  "token_usage.total_tokens",
  "timing.available",
  "timing.elapsed_ms",
  "outcome.changed_files_count",
  "outcome.completed_user_goal",
  "outcome.residual_risk_count",
  "outcome.skipped_required_checks",
  "failure.primary_phase",
  "failure.category",
  "failure.retry_count",
  "failure.blocked_reason",
  "artifact_health.artifact_write_ok",
  "artifact_health.summary_append_ok",
  "artifact_health.schema_validation_ok",
  "revision.git_commit",
  "revision.worktree_dirty",
  "revision.skill_manifest_version",
  "notes",
];
const METRICS_FIELDS_ADDED_IN_0_2_1 = new Set([
  "review.timeout_attempts",
  "review.eventual_pass_after_timeout",
]);
const LEGACY_MISSING_VERSION_REQUIRED_METRICS_PATHS = REQUIRED_METRICS_PATHS.filter(
  (requiredPath) =>
    ![
      "plugin.",
      "host.",
      "invocation.",
      "capabilities.",
      "safety.",
      "failure.",
      "artifact_health.",
      "revision.",
    ].some((prefix) => requiredPath.startsWith(prefix)) &&
    !METRICS_FIELDS_ADDED_IN_0_2_1.has(requiredPath),
);

function usage() {
  return `Usage: node scripts/ultracode-doctor-logs.mjs [options]

Options:
  --log-root <path>        Ultracode log root. Defaults to \${CODEX_HOME:-~/.codex}/log/ultracode.
  --run-root <path>        Check one run directory instead of walking the whole log root.
  --summary <path>         summary.jsonl path. Defaults to <log-root>/summary.jsonl.
  --plugin-version <ver>   Filter metrics records by plugin.version.
  --workspace-key <key>    Filter metrics records by workspace_key.
  --workspace-key-normalized
                           Match workspace_key case-insensitively after simple normalization.
  --run-id <id>            Filter metrics records by run_id.
  --terminal-only          Only validate terminal runs: complete, blocked, or cancelled.
  --legacy-missing-version <level>
                           error | warning. Defaults to error.
  --json                   Emit JSON instead of human-readable text.
  --fail-on <level>        none | warning | error. Defaults to none.
  --strict                 Alias for --fail-on error.
  -h, --help               Show this help.

The command only reads the Ultracode-owned log tree. It does not read Codex
history.jsonl, session_index.jsonl, private session logs, or SQLite databases.`;
}

function parseArgs(argv) {
  const homeLogRoot = path.join(
    process.env.CODEX_HOME || path.join(os.homedir(), ".codex"),
    "log",
    "ultracode",
  );
  const options = {
    logRoot: homeLogRoot,
    runRoot: null,
    summaryPath: null,
    pluginVersion: null,
    workspaceKey: null,
    workspaceKeyNormalized: false,
    runId: null,
    terminalOnly: false,
    legacyMissingVersion: "error",
    json: false,
    failOn: "none",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) {
        throw new Error(`Missing value for ${arg}`);
      }
      return argv[index];
    };

    switch (arg) {
      case "--log-root":
        options.logRoot = path.resolve(next());
        break;
      case "--run-root":
        options.runRoot = path.resolve(next());
        break;
      case "--summary":
        options.summaryPath = path.resolve(next());
        break;
      case "--plugin-version":
        options.pluginVersion = next();
        break;
      case "--workspace-key":
        options.workspaceKey = next();
        break;
      case "--workspace-key-normalized":
        options.workspaceKeyNormalized = true;
        break;
      case "--run-id":
        options.runId = next();
        break;
      case "--terminal-only":
        options.terminalOnly = true;
        break;
      case "--legacy-missing-version":
        options.legacyMissingVersion = next();
        break;
      case "--json":
        options.json = true;
        break;
      case "--fail-on":
        options.failOn = next();
        break;
      case "--strict":
        options.failOn = "error";
        break;
      case "-h":
      case "--help":
        console.log(usage());
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!new Set(["none", "warning", "error"]).has(options.failOn)) {
    throw new Error("--fail-on must be one of: none, warning, error");
  }
  if (!new Set(["error", "warning"]).has(options.legacyMissingVersion)) {
    throw new Error("--legacy-missing-version must be one of: error, warning");
  }

  options.summaryPath =
    options.summaryPath || path.join(options.logRoot, "summary.jsonl");
  return options;
}

function getValue(object, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    return Object.prototype.hasOwnProperty.call(current, key)
      ? current[key]
      : undefined;
  }, object);
}

function readJsonFile(filePath) {
  try {
    return { ok: true, value: JSON.parse(fs.readFileSync(filePath, "utf8")) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function walkFiles(directory, fileNames, results = []) {
  if (!fs.existsSync(directory)) {
    return results;
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      continue;
    }
    if (entry.isDirectory()) {
      walkFiles(fullPath, fileNames, results);
      continue;
    }
    if (fileNames.has(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function parseSummary(summaryPath) {
  const records = [];
  const issues = [];
  const byRunId = new Map();

  if (!fs.existsSync(summaryPath)) {
    issues.push({
      severity: "warning",
      code: "summary_missing",
      path: summaryPath,
      message: "summary.jsonl does not exist.",
    });
    return { records, byRunId, issues };
  }

  const lines = fs.readFileSync(summaryPath, "utf8").split(/\n/);
  lines.forEach((line, index) => {
    if (!line.trim()) {
      return;
    }
    try {
      const record = JSON.parse(line);
      records.push({ line: index + 1, record });
      const runId = record.run_id;
      if (!runId) {
        issues.push({
          severity: "error",
          code: "summary_missing_run_id",
          path: summaryPath,
          line: index + 1,
          message: "summary record is missing run_id.",
        });
        return;
      }
      const existing = byRunId.get(runId) || [];
      existing.push({ line: index + 1, record });
      byRunId.set(runId, existing);
    } catch (error) {
      issues.push({
        severity: "error",
        code: "summary_parse_error",
        path: summaryPath,
        line: index + 1,
        message: error.message,
      });
    }
  });

  for (const [runId, matches] of byRunId.entries()) {
    if (matches.length > 1) {
      issues.push({
        severity: "error",
        code: "summary_duplicate_run_id",
        run_id: runId,
        path: summaryPath,
        message: `summary.jsonl has ${matches.length} records for this run_id.`,
      });
    }
  }

  return { records, byRunId, issues };
}

function addIssue(issues, severity, code, context, message) {
  issues.push({ severity, code, ...context, message });
}

function isTerminal(status) {
  return TERMINAL_STATUSES.has(status);
}

function parseVersion(version) {
  if (typeof version !== "string") {
    return null;
  }
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) {
    return null;
  }
  return match.slice(1, 4).map((part) => Number.parseInt(part, 10));
}

function isVersionAtLeast(version, minimum) {
  const parsedVersion = parseVersion(version);
  const parsedMinimum = parseVersion(minimum);
  if (!parsedVersion || !parsedMinimum) {
    return false;
  }
  for (let index = 0; index < parsedVersion.length; index += 1) {
    if (parsedVersion[index] > parsedMinimum[index]) {
      return true;
    }
    if (parsedVersion[index] < parsedMinimum[index]) {
      return false;
    }
  }
  return true;
}

function finalReportMentionsTimeout(artifactRoot) {
  const reportPath = path.join(artifactRoot, "final-report.md");
  if (!fs.existsSync(reportPath)) {
    return false;
  }
  const text = fs.readFileSync(reportPath, "utf8");
  return /timeout|timed out|disconnected|interruption|interrupted|closed/i.test(
    text,
  );
}

function requiredMetricsPathsFor(metrics, options) {
  const pluginVersion = getValue(metrics, "plugin.version");
  if (!pluginVersion && options.legacyMissingVersion === "warning") {
    return LEGACY_MISSING_VERSION_REQUIRED_METRICS_PATHS;
  }
  if (pluginVersion && !isVersionAtLeast(pluginVersion, "0.2.1")) {
    return REQUIRED_METRICS_PATHS.filter(
      (requiredPath) => !METRICS_FIELDS_ADDED_IN_0_2_1.has(requiredPath),
    );
  }
  return REQUIRED_METRICS_PATHS;
}

function analyzeMetrics(metricsPath, metrics, summary, options) {
  const issues = [];
  const context = {
    run_id: metrics.run_id || null,
    path: metricsPath,
  };
  const artifactRoot =
    typeof metrics.artifact_root === "string"
      ? metrics.artifact_root
      : path.dirname(metricsPath);

  if (!metrics.run_id) {
    addIssue(issues, "error", "metrics_missing_run_id", context, "metrics.json is missing run_id.");
  }

  if (!RUN_STATUSES.has(metrics.status)) {
    addIssue(
      issues,
      "error",
      "invalid_metrics_status",
      context,
      `metrics.status must be one of ${Array.from(RUN_STATUSES).join(", ")}; got ${JSON.stringify(metrics.status)}.`,
    );
  }

  if (!MODES.has(metrics.mode)) {
    addIssue(issues, "error", "invalid_mode", context, `metrics.mode is invalid: ${JSON.stringify(metrics.mode)}.`);
  }

  if (!RISK_LEVELS.has(metrics.risk_level)) {
    addIssue(issues, "error", "invalid_risk_level", context, `metrics.risk_level is invalid: ${JSON.stringify(metrics.risk_level)}.`);
  }

  if (!OBJECTIVE_KINDS.has(metrics.objective_kind)) {
    addIssue(
      issues,
      "error",
      "invalid_objective_kind",
      context,
      `metrics.objective_kind is invalid: ${JSON.stringify(metrics.objective_kind)}.`,
    );
  }

  const failureCategory = getValue(metrics, "failure.category");
  if (failureCategory !== undefined && failureCategory !== null && !FAILURE_CATEGORIES.has(failureCategory)) {
    addIssue(
      issues,
      "error",
      "invalid_failure_category",
      context,
      `failure.category is invalid: ${JSON.stringify(failureCategory)}.`,
    );
  }

  if (
    !getValue(metrics, "plugin.version") &&
    options.legacyMissingVersion === "warning"
  ) {
    addIssue(
      issues,
      "warning",
      "legacy_metrics_missing_plugin_version",
      context,
      "metrics.json has no plugin.version; applying legacy missing-version checks because --legacy-missing-version=warning was set.",
    );
  }

  for (const requiredPath of requiredMetricsPathsFor(metrics, options)) {
    if (getValue(metrics, requiredPath) === undefined) {
      addIssue(
        issues,
        "error",
        "missing_metrics_field",
        { ...context, field: requiredPath },
        `metrics.json is missing required field ${requiredPath}.`,
      );
    }
  }

  if (!fs.existsSync(artifactRoot)) {
    addIssue(issues, "error", "artifact_root_missing", context, `artifact_root does not exist: ${artifactRoot}`);
    return issues;
  }

  for (const artifact of REQUIRED_ARTIFACTS) {
    const artifactPath = path.join(artifactRoot, artifact);
    if (!fs.existsSync(artifactPath)) {
      addIssue(
        issues,
        "error",
        "missing_artifact",
        { ...context, artifact },
        `required artifact is missing: ${artifact}`,
      );
    }
  }

  const statePath = path.join(artifactRoot, "state.json");
  const stateResult = readJsonFile(statePath);
  if (!stateResult.ok) {
    addIssue(
      issues,
      "error",
      "state_parse_error",
      { ...context, path: statePath },
      stateResult.error,
    );
  } else {
    const state = stateResult.value;
    if (state.run_id && metrics.run_id && state.run_id !== metrics.run_id) {
      addIssue(
        issues,
        "error",
        "state_metrics_run_id_mismatch",
        context,
        `state.run_id (${state.run_id}) does not match metrics.run_id (${metrics.run_id}).`,
      );
    }
    if (state.status && !RUN_STATUSES.has(state.status)) {
      addIssue(
        issues,
        "error",
        "invalid_state_status",
        context,
        `state.status is invalid: ${JSON.stringify(state.status)}.`,
      );
    }
    if (
      state.status &&
      metrics.status &&
      state.status !== metrics.status &&
      (isTerminal(state.status) || isTerminal(metrics.status))
    ) {
      addIssue(
        issues,
        "error",
        "state_metrics_status_mismatch",
        context,
        `terminal status mismatch: state=${state.status}, metrics=${metrics.status}.`,
      );
    }
  }

  const summaryMatches = metrics.run_id ? summary.byRunId.get(metrics.run_id) || [] : [];
  const summaryRecord = summaryMatches[summaryMatches.length - 1]?.record || null;
  const pluginName = getValue(metrics, "plugin.name");
  const pluginVersion = getValue(metrics, "plugin.version");
  const shouldWarnOnFinalizationGaps = isVersionAtLeast(
    pluginVersion,
    FINALIZATION_WARNING_MIN_VERSION,
  );

  if (isTerminal(metrics.status) && summaryMatches.length === 0) {
    addIssue(
      issues,
      "error",
      "terminal_run_missing_summary",
      context,
      "terminal run has no matching summary.jsonl record.",
    );
  }

  if (getValue(metrics, "artifact_health.summary_append_ok") === true && summaryMatches.length === 0) {
    addIssue(
      issues,
      "error",
      "summary_append_ok_false_positive",
      context,
      "artifact_health.summary_append_ok is true but no matching summary.jsonl record exists.",
    );
  }

  if (summaryRecord) {
    if (shouldWarnOnFinalizationGaps) {
      const summaryPluginName = summaryRecord.plugin_name;
      const summaryPluginVersion = summaryRecord.plugin_version;

      if (pluginName && !summaryPluginName) {
        addIssue(
          issues,
          "warning",
          "summary_plugin_metadata_missing",
          { ...context, field: "plugin_name" },
          "summary record is missing plugin_name while metrics.plugin.name is available.",
        );
      } else if (pluginName && summaryPluginName !== pluginName) {
        addIssue(
          issues,
          "warning",
          "summary_plugin_metadata_mismatch",
          { ...context, field: "plugin_name" },
          `summary plugin_name (${JSON.stringify(summaryPluginName)}) does not match metrics.plugin.name (${JSON.stringify(pluginName)}).`,
        );
      }

      if (pluginVersion && !summaryPluginVersion) {
        addIssue(
          issues,
          "warning",
          "summary_plugin_metadata_missing",
          { ...context, field: "plugin_version" },
          "summary record is missing plugin_version while metrics.plugin.version is available.",
        );
      } else if (pluginVersion && summaryPluginVersion !== pluginVersion) {
        addIssue(
          issues,
          "warning",
          "summary_plugin_metadata_mismatch",
          { ...context, field: "plugin_version" },
          `summary plugin_version (${JSON.stringify(summaryPluginVersion)}) does not match metrics.plugin.version (${JSON.stringify(pluginVersion)}).`,
        );
      }
    }

    if (summaryRecord.status && !RUN_STATUSES.has(summaryRecord.status)) {
      addIssue(
        issues,
        "error",
        "invalid_summary_status",
        context,
        `summary status is invalid: ${JSON.stringify(summaryRecord.status)}.`,
      );
    }
    if (
      isTerminal(metrics.status) &&
      summaryRecord.status &&
      summaryRecord.status !== metrics.status
    ) {
      addIssue(
        issues,
        "error",
        "summary_metrics_status_mismatch",
        context,
        `summary status (${summaryRecord.status}) does not match metrics status (${metrics.status}).`,
      );
    }
    if (summaryRecord.artifact_root && path.resolve(summaryRecord.artifact_root) !== path.resolve(artifactRoot)) {
      addIssue(
        issues,
        "warning",
        "summary_artifact_root_mismatch",
        context,
        "summary artifact_root does not match metrics artifact_root.",
      );
    }
  }

  if (
    shouldWarnOnFinalizationGaps &&
    isTerminal(metrics.status) &&
    getValue(metrics, "artifact_health.summary_append_ok") !== true
  ) {
    addIssue(
      issues,
      "warning",
      "terminal_summary_append_unconfirmed",
      context,
      `terminal ${pluginVersion} run should leave artifact_health.summary_append_ok=true after re-reading the matching summary record.`,
    );
  }

  const agentTimeouts = Number(getValue(metrics, "delegation.agent_timeouts") || 0);
  const reviewTimeouts = Number(getValue(metrics, "review.timeout_attempts") || 0);
  if (agentTimeouts > 0 && reviewTimeouts === 0) {
    addIssue(
      issues,
      "warning",
      "timeout_not_split_into_review",
      context,
      "delegation.agent_timeouts is positive but review.timeout_attempts is missing or zero.",
    );
  }
  if (agentTimeouts > 0 && !finalReportMentionsTimeout(artifactRoot)) {
    addIssue(
      issues,
      "warning",
      "timeout_not_reported",
      context,
      "agent timeout is recorded but final-report.md does not mention timeout/interruption evidence.",
    );
  }

  const schemaValidationOk = getValue(metrics, "artifact_health.schema_validation_ok");
  if (schemaValidationOk === true && issues.some((issue) => issue.severity === "error")) {
    addIssue(
      issues,
      "error",
      "schema_validation_false_positive",
      context,
      "artifact_health.schema_validation_ok is true while this doctor found errors.",
    );
  }

  return issues;
}

function shouldInclude(metrics, options) {
  if (options.pluginVersion && getValue(metrics, "plugin.version") !== options.pluginVersion) {
    return false;
  }
  if (
    options.workspaceKey &&
    !workspaceMatches(metrics.workspace_key, options.workspaceKey, options)
  ) {
    return false;
  }
  if (options.runId && metrics.run_id !== options.runId) {
    return false;
  }
  return true;
}

function normalizeWorkspaceKey(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-");
}

function workspaceMatches(actual, expected, options) {
  if (!options.workspaceKeyNormalized) {
    return actual === expected;
  }
  return normalizeWorkspaceKey(actual) === normalizeWorkspaceKey(expected);
}

function collectMetricsPaths(options) {
  if (options.runRoot) {
    return [path.join(options.runRoot, "metrics.json")];
  }
  return walkFiles(options.logRoot, new Set(["metrics.json"]));
}

function countIssuesByCode(issues, severity) {
  const counts = {};
  for (const issue of issues) {
    if (severity && issue.severity !== severity) {
      continue;
    }
    counts[issue.code] = (counts[issue.code] || 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function renderHuman(result) {
  const lines = [
    "Ultracode log doctor",
    `log_root: ${result.log_root}`,
    `summary: ${result.summary_path}`,
    `metrics_discovered: ${result.metrics_discovered}`,
    `metrics_checked: ${result.metrics_checked}`,
    `terminal_metrics_checked: ${result.terminal_metrics_checked}`,
    `nonterminal_metrics_checked: ${result.nonterminal_metrics_checked}`,
    `nonterminal_metrics_skipped: ${result.nonterminal_metrics_skipped}`,
    `filter_skipped: ${result.filter_skipped}`,
    `summary_records: ${result.summary_records}`,
    `errors: ${result.counts.error}`,
    `warnings: ${result.counts.warning}`,
  ];

  if (result.filters.plugin_version || result.filters.workspace_key || result.filters.run_id) {
    lines.push(`filters: ${JSON.stringify(result.filters)}`);
  }

  if (Object.keys(result.errors_by_code).length > 0) {
    lines.push(`errors_by_code: ${JSON.stringify(result.errors_by_code)}`);
  }
  if (Object.keys(result.warnings_by_code).length > 0) {
    lines.push(`warnings_by_code: ${JSON.stringify(result.warnings_by_code)}`);
  }

  if (result.issues.length === 0) {
    lines.push("No issues found.");
    return lines.join("\n");
  }

  lines.push("");
  for (const issue of result.issues) {
    const location = [
      issue.run_id ? `run=${issue.run_id}` : null,
      issue.line ? `line=${issue.line}` : null,
      issue.field ? `field=${issue.field}` : null,
      issue.artifact ? `artifact=${issue.artifact}` : null,
      issue.path ? `path=${issue.path}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    lines.push(`[${issue.severity}] ${issue.code}${location ? ` ${location}` : ""}`);
    lines.push(`  ${issue.message}`);
  }

  return lines.join("\n");
}

function run() {
  const options = parseArgs(process.argv.slice(2));
  const summary = parseSummary(options.summaryPath);
  const metricsPaths = collectMetricsPaths(options);
  const issues = [...summary.issues];
  let metricsDiscovered = 0;
  let metricsChecked = 0;
  let terminalMetricsChecked = 0;
  let nonterminalMetricsChecked = 0;
  let nonterminalMetricsSkipped = 0;
  let filterSkipped = 0;

  for (const metricsPath of metricsPaths) {
    const parsed = readJsonFile(metricsPath);
    if (!parsed.ok) {
      addIssue(
        issues,
        "error",
        "metrics_parse_error",
        { path: metricsPath },
        parsed.error,
      );
      continue;
    }
    metricsDiscovered += 1;
    if (!shouldInclude(parsed.value, options)) {
      filterSkipped += 1;
      continue;
    }

    const terminal = isTerminal(parsed.value.status);
    if (options.terminalOnly && !terminal) {
      nonterminalMetricsSkipped += 1;
      continue;
    }
    metricsChecked += 1;
    if (terminal) {
      terminalMetricsChecked += 1;
    } else {
      nonterminalMetricsChecked += 1;
    }
    issues.push(...analyzeMetrics(metricsPath, parsed.value, summary, options));
  }

  const errorsByCode = countIssuesByCode(issues, "error");
  const warningsByCode = countIssuesByCode(issues, "warning");

  const result = {
    schema_version: 1,
    log_root: options.logRoot,
    summary_path: options.summaryPath,
    filters: {
      plugin_version: options.pluginVersion,
      workspace_key: options.workspaceKey,
      workspace_key_normalized: options.workspaceKeyNormalized,
      run_id: options.runId,
      terminal_only: options.terminalOnly,
      legacy_missing_version: options.legacyMissingVersion,
    },
    metrics_discovered: metricsDiscovered,
    metrics_checked: metricsChecked,
    terminal_metrics_checked: terminalMetricsChecked,
    nonterminal_metrics_checked: nonterminalMetricsChecked,
    nonterminal_metrics_skipped: nonterminalMetricsSkipped,
    filter_skipped: filterSkipped,
    summary_records: summary.records.length,
    counts: {
      error: issues.filter((issue) => issue.severity === "error").length,
      warning: issues.filter((issue) => issue.severity === "warning").length,
    },
    errors_by_code: errorsByCode,
    warnings_by_code: warningsByCode,
    issues,
  };

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderHuman(result));
  }

  if (options.failOn === "error" && result.counts.error > 0) {
    process.exitCode = 1;
  }
  if (
    options.failOn === "warning" &&
    (result.counts.error > 0 || result.counts.warning > 0)
  ) {
    process.exitCode = 1;
  }
}

try {
  run();
} catch (error) {
  console.error(`ultracode-doctor-logs: ${error.message}`);
  process.exit(2);
}
