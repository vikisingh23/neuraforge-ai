/**
 * Lock Blade — Cross-pipeline mutual exclusion
 * File-based locks with TTL auto-expiry.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, readdirSync } from "fs";
import { join } from "path";

const LOCK_DIR = ".neuraforge/locks";

function ensureDir() { if (!existsSync(LOCK_DIR)) mkdirSync(LOCK_DIR, { recursive: true }); }

function lockPath(resource) { return join(LOCK_DIR, `${resource.replace(/\//g, "_")}.lock`); }

function isExpired(lock) {
  const expires = new Date(lock.acquired_at).getTime() + (lock.ttl_minutes * 60 * 1000);
  return Date.now() > expires;
}

export const lockTools = [
  {
    name: "lock_acquire",
    description: "Acquire a lock on a resource (service, file, entity)",
    schema: {
      type: "object",
      properties: {
        resource: { type: "string" },
        feature: { type: "string" },
        ttl_minutes: { type: "number" }
      },
      required: ["resource", "feature"]
    },
    handler({ resource, feature, ttl_minutes = 120 }) {
      ensureDir();
      const p = lockPath(resource);
      if (existsSync(p)) {
        const existing = JSON.parse(readFileSync(p, "utf-8"));
        if (!isExpired(existing)) {
          return { acquired: false, blocked_by: existing.feature, held_since: existing.acquired_at };
        }
        unlinkSync(p); // expired — clean up
      }
      const lock = { resource, feature, acquired_at: new Date().toISOString(), ttl_minutes };
      writeFileSync(p, JSON.stringify(lock, null, 2));
      return { acquired: true, resource, feature, expires_in_minutes: ttl_minutes };
    }
  },
  {
    name: "lock_release",
    description: "Release a lock on a resource",
    schema: {
      type: "object",
      properties: { resource: { type: "string" }, feature: { type: "string" } },
      required: ["resource", "feature"]
    },
    handler({ resource, feature }) {
      const p = lockPath(resource);
      if (!existsSync(p)) return { released: true, note: "Lock did not exist" };
      const lock = JSON.parse(readFileSync(p, "utf-8"));
      if (lock.feature !== feature) return { error: `Lock held by '${lock.feature}', not '${feature}'` };
      unlinkSync(p);
      return { released: true, resource };
    }
  },
  {
    name: "lock_list",
    description: "List all active locks",
    schema: { type: "object", properties: {} },
    handler() {
      ensureDir();
      const files = readdirSync(LOCK_DIR).filter(f => f.endsWith(".lock"));
      return files.map(f => {
        const lock = JSON.parse(readFileSync(join(LOCK_DIR, f), "utf-8"));
        return { ...lock, expired: isExpired(lock) };
      }).filter(l => !l.expired);
    }
  }
];
