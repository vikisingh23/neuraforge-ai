/**
 * Governance Blade — Permission checks and boundary enforcement
 */
import { readFileSync, existsSync } from "fs";
import { parse } from "yaml";

const GOVERNANCE_PATH = ".neuraforge/governance.yaml";

function loadGovernance() {
  if (!existsSync(GOVERNANCE_PATH)) return { agent_permissions: {}, protected_paths: [] };
  return parse(readFileSync(GOVERNANCE_PATH, "utf-8"));
}

function matchesPattern(filePath, pattern) {
  const regex = new RegExp("^" + pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$");
  return regex.test(filePath);
}

export const governanceTools = [
  {
    name: "govern_check_permission",
    description: "Check if an agent is allowed to modify a file path",
    schema: {
      type: "object",
      properties: { agent: { type: "string" }, file_path: { type: "string" } },
      required: ["agent", "file_path"]
    },
    handler({ agent, file_path }) {
      const gov = loadGovernance();
      const perms = gov.agent_permissions?.[agent];
      if (!perms) return { allowed: true, reason: "No restrictions defined for agent" };

      if (perms.cannot_touch?.some(p => matchesPattern(file_path, p))) {
        return { allowed: false, reason: `Agent '${agent}' cannot modify '${file_path}'` };
      }
      for (const pp of gov.protected_paths || []) {
        if (matchesPattern(file_path, pp.pattern)) {
          return { allowed: false, reason: pp.policy, requires_approval: pp.approver };
        }
      }
      return { allowed: true };
    }
  },
  {
    name: "govern_validate_handoff",
    description: "Validate handoff YAML against schema v3",
    schema: {
      type: "object",
      properties: { yaml_content: { type: "string" } },
      required: ["yaml_content"]
    },
    handler({ yaml_content }) {
      try {
        const doc = parse(yaml_content);
        const errors = [];
        if (!doc?.routing?.from) errors.push("missing routing.from");
        if (!doc?.routing?.to) errors.push("missing routing.to");
        if (!doc?.routing?.stage) errors.push("missing routing.stage");
        if (!doc?.outcome?.verdict) errors.push("missing outcome.verdict");
        if (!doc?.outcome?.summary) errors.push("missing outcome.summary");
        if (!["complete", "approved", "needs-revision", "rejected", "blocked"].includes(doc?.outcome?.verdict)) {
          errors.push(`invalid verdict: ${doc?.outcome?.verdict}`);
        }
        return errors.length ? { valid: false, errors } : { valid: true };
      } catch (e) {
        return { valid: false, errors: [`YAML parse error: ${e.message}`] };
      }
    }
  },
  {
    name: "govern_get_boundaries",
    description: "Get all governance rules (protected paths, agent permissions)",
    schema: { type: "object", properties: {} },
    handler() { return loadGovernance(); }
  }
];
