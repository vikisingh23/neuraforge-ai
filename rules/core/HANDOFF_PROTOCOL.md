# Agent Handoff Protocol v3.0

Universal schema for inter-agent communication across NeuraForge pipelines. Every agent writes this as YAML frontmatter at the top of its output file.

## Design Principles

1. **Smallest high-signal token set** — pointers over payloads, summaries over documents
2. **Critical items accumulate with tiering** — active items visible, resolved items archived
3. **Progressive disclosure** — summary → critical.active → full file (agent pulls more only if needed)
4. **Deterministic routing** — `verdict` + `stage_type` = unambiguous next action
5. **Enforcement over trust** — machine-verifiable invariants, not self-reported confidence
6. **Context snapshots for implementers** — actual code patterns, not just file paths

## Schema

```yaml
---
schema: handoff/v3

routing:
  from: {agent-name}
  to: {next-agent | [parallel-agents]}
  stage: {number}
  stage_type: {generate | review | gate | resolve}
  feature: {feature-slug}
  timestamp: {ISO-8601}

outcome:
  verdict: {complete | approved | needs-revision | rejected | blocked}
  summary: |
    {concise — what was done, what was decided, key outcomes}

critical:
  active:
    - id: {C|E|AC}-{NNN}
      severity: {regulatory | architectural | operational}
      text: "{description}"
      added_by: {agent-name}
      added_stage: {N}
      status: {open | ✅ | ⏳ | ❌}
      proof: "{test name or code location}"  # when status = ✅
  resolved:
    - id: {C|E|AC}-{NNN}
      text: "{description}"
      status: ✅
      proof: "{evidence}"
      resolved_stage: {N}

enforcement:
  questions_answered:
    - question: "{from previous stage forward.questions}"
      answer: "{this agent's answer}"
      answered_by: {agent-name}
  invariants:
    - "{machine-checkable condition}"

context:
  reads: [{file paths consumed}]
  writes: [{file paths produced}]
  system_context: [{existing services/entities/APIs}]
  prior_decisions: [{relevant ADRs or settled patterns}]
  snapshots:
    - label: "{what this shows}"
      source: "{file:lines}"
      content: |
        {actual code snippet — max 3 snapshots per handoff}

forward:
  focus: [{what next agent should examine}]
  blockers: [{must-resolve before proceeding}]
  questions: [{explicit asks next agent MUST answer in their enforcement.questions_answered}]

gaps:
  - "{deferred item} — {reason}"

risks:
  - {high|medium|low}: {detail}
---
```

## Field Reference

### routing

| Field | Required | Purpose |
|-------|----------|---------|
| `from` | Yes | Agent that produced this output |
| `to` | Yes | Next agent (string or array for parallel fan-out) |
| `stage` | Yes | Pipeline stage number |
| `stage_type` | Yes | Orchestrator behavior trigger |
| `feature` | Yes | Matches workspace directory name |
| `timestamp` | Yes | When handoff was written |

**stage_type semantics:**

| Type | Orchestrator Action |
|------|-------------------|
| `generate` | verdict=complete → advance to `to` |
| `review` | verdict=needs-revision → loop back. Max 2 loops then escalate to human. |
| `gate` | STOP. Present to human. Wait for explicit decision. |
| `resolve` | Re-run previous stage incorporating fixes from `forward.blockers` |

### outcome

| Field | Required | Purpose |
|-------|----------|---------|
| `verdict` | Yes | Determines pipeline flow |
| `summary` | Yes | Decision aid — enough for next agent to decide whether to read full files |

**Verdict → Action mapping:**
```
complete       → advance pipeline
approved       → advance pipeline
needs-revision → loop back (max 2x, then escalate)
rejected       → STOP, escalate to human with reasons
blocked        → STOP, show forward.blockers to human
```

Note: `confidence` field removed in v3. Confidence is now COMPUTED by the orchestrator based on `critical.active` status counts, not self-reported.

### critical (Tiered — The Core Mechanism)

The critical section is the protocol's primary defense against missed requirements. v3 splits it into `active` and `resolved` to prevent unbounded growth.

**Rules:**
1. Items accumulate — each agent can ADD but NEVER REMOVE
2. Only a HUMAN can remove or override a critical item
3. New items added by current agent are visible via `added_by` + `added_stage`
4. When an item is addressed, it moves from `active` → `resolved` with proof
5. Orchestrator only shows `active` items to downstream agents by default

**Item ID format:**
- `C-001` through `C-NNN` = constraints (regulatory/business rules)
- `E-001` through `E-NNN` = edge cases (scenarios)
- `AC-001` through `AC-NNN` = acceptance criteria

**Severity levels:**
- `regulatory` — violated = legal/compliance risk, fines, license issues
- `architectural` — violated = system instability, data corruption, security breach
- `operational` — violated = bugs, poor UX, support tickets

**Status markers:**
- `open` — not yet addressed (default when added)
- `✅` — handled, with proof (test name or code location)
- `⏳` — intentionally deferred (must appear in `gaps` with reason, human-approved)
- `❌` — attempted but FAILED or found incomplete (auto-BLOCKER)

**Example — active items (what agents see):**
```yaml
critical:
  active:
    - id: C-005
      severity: regulatory
      text: "SEBI: No refund of debited installments during cooling-off"
      added_by: devils-advocate
      added_stage: 2
      status: open
      proof: null
    - id: E-006
      severity: operational
      text: "Cancel request when step-up amount change is scheduled"
      added_by: devils-advocate
      added_stage: 2
      status: open
      proof: null
```

**Example — resolved items (archived, collapsed):**
```yaml
critical:
  resolved:
    - id: C-001
      text: "SEBI: 30-day cooling-off mandatory"
      status: ✅
      proof: "SipValidator.cs:42 + [test_cooling_off_boundary, test_cooling_off_reject]"
      resolved_stage: 6
    - id: E-001
      text: "Cancel on SIP execution date"
      status: ✅
      proof: "[test_same_day_cancel, test_after_cutoff] + CancelAsync:L34"
      resolved_stage: 6
```

**Orchestrator computed confidence:**
```
if count(active where status=❌) > 0 → BLOCKED (cannot proceed)
if count(active where status=open) > 0 → IN PROGRESS
if count(active where status=open) == 0 AND all resolved → COMPLETE
```

### enforcement (Machine-Verifiable)

Replaces self-reported confidence. The orchestrator validates these before routing to the next stage.

| Field | Purpose |
|-------|---------|
| `questions_answered` | Proves this agent addressed questions from the previous stage |
| `invariants` | Machine-checkable conditions the orchestrator enforces |

**questions_answered — closing the loop:**

When Stage N includes `forward.questions`, Stage N+1 MUST include matching entries in `enforcement.questions_answered`. The orchestrator blocks advancement if any question is unanswered.

```yaml
# Stage 5 (architect) asked:
forward:
  questions:
    - "Optimistic or pessimistic concurrency for cancel?"
    - "Should RTA dispatch happen before or after commit?"

# Stage 6 (forge) MUST answer:
enforcement:
  questions_answered:
    - question: "Optimistic or pessimistic concurrency for cancel?"
      answer: "Optimistic — RowVersion column, retry on conflict"
      answered_by: forge
    - question: "Should RTA dispatch happen before or after commit?"
      answer: "After commit — using transactional outbox pattern"
      answered_by: forge
```

**invariants — pipeline gates:**

```yaml
enforcement:
  invariants:
    - "count(critical.active where status=❌) == 0"
    - "all items in critical.active have status ✅ or ⏳"
    - "all ⏳ items appear in gaps with reason"
```

The orchestrator evaluates invariants. If any fails → pipeline BLOCKS with clear error.

### context

| Field | When Used | Purpose |
|-------|-----------|---------|
| `reads` | Always | Files this agent consumed |
| `writes` | Always | Files this agent produced |
| `system_context` | Stage 1 (PM) | Existing services, entities, APIs relevant to feature |
| `prior_decisions` | When relevant | ADRs or settled patterns that constrain this work |
| `snapshots` | Implementation stages | Actual code patterns for consistency |

**system_context (Stage 1 — gives downstream agents codebase awareness):**
```yaml
context:
  system_context:
    - "SipService exists (create, pause, resume) — src/Services/SipService.cs"
    - "Sip entity: Id, SchemeCode, Amount, Frequency, Status, MandateId, CreatedAt"
    - "Existing APIs: GET /api/sip, POST /api/sip, PATCH /api/sip/{id}/pause"
    - "IRtaGateway interface with SendCancellationAsync()"
    - "MandateService handles mandate lifecycle"
```

**snapshots (implementation stages — actual code for pattern consistency):**

Use when the next agent needs to match existing patterns. Max 3 snippets per handoff — pick the most relevant.

```yaml
context:
  snapshots:
    - label: "Existing pause pattern (forge should follow same structure)"
      source: "SipService.cs:89-104"
      content: |
        public async Task<Result> PauseSipAsync(Guid sipId, string reason)
        {
            var sip = await _repository.GetByIdAsync(sipId);
            if (sip is null) return Result.Failure(SipErrors.NotFound);
            if (sip.Status != SipStatus.Active) return Result.Failure(SipErrors.InvalidStatus);
            sip.Pause(reason);
            await _unitOfWork.SaveChangesAsync();
            return Result.Success();
        }
    - label: "RTA queue dispatch pattern"
      source: "SipService.cs:112-118"
      content: |
        await _messageBus.PublishAsync(new RtaPauseMessage
        {
            SipId = sip.Id,
            RequestedAt = DateTime.UtcNow,
            Reason = reason
        });
```

### forward

| Field | Required | Purpose |
|-------|----------|---------|
| `focus` | Yes | Advisory — what to examine (next agent decides depth) |
| `blockers` | Yes (can be empty) | Must-resolve items. Non-empty = pipeline pauses. |
| `questions` | Optional | Explicit asks. Next agent MUST answer in `enforcement.questions_answered`. |

### gaps

Items intentionally deferred. Format: `"{what} — {reason}"`

Gaps are living items — they can be:
- **Promoted** to `critical.active` if a later stage determines they're needed now
- **Closed** if resolved in a later stage (note closure in summary)
- **Carried** to a follow-up feature/PR

```yaml
gaps:
  - "NRI cancellation — separate regulatory framework, Phase 2"
  - "Email notifications — interface created, blocked on template approval from marketing"
  - "Dashboard cancellation history — frontend, separate PR"
```

### risks

Severity guide:
- `high` — production incident, data loss, regulatory violation, security breach
- `medium` — bugs, poor UX, recoverable issues
- `low` — minor concerns, tech debt, acceptable tradeoffs

```yaml
risks:
  - high: "RTA gateway has no retry mechanism — failed cancel = stuck state"
  - medium: "No integration test for full RTA round-trip (mocked only)"
  - low: "CancellationReason enum not extensible — may need migration later"
```

## Full Pipeline Example: SIP Cancellation (5 Stages)

### Stage 1: product-manager → devils-advocate

```yaml
---
schema: handoff/v3

routing:
  from: product-manager
  to: devils-advocate
  stage: 1
  stage_type: generate
  feature: sip-cancellation
  timestamp: 2026-05-21T10:00:00+05:30

outcome:
  verdict: complete
  summary: |
    BRS for online SIP cancellation. Investors cancel active SIPs via app/web.
    SEBI cooling-off applies (can cancel, no refund of debited installments).
    RTA processes T+1. 12 acceptance criteria. Mandate lifecycle handled.

critical:
  active:
    - id: C-001
      severity: regulatory
      text: "SEBI: 30-day cooling-off — can cancel but no refund of debited installments"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: C-002
      severity: operational
      text: "RTA cut-off 2PM IST — requests after cut-off process next business day"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: C-003
      severity: regulatory
      text: "Minimum 3 SIP installments completed before cancellation allowed"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: C-004
      severity: architectural
      text: "Mandate must be in ACTIVE state to process cancellation"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: E-001
      severity: operational
      text: "Cancel request on SIP execution date (same day debit)"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: E-002
      severity: operational
      text: "Cancel during AMC/RTA holiday (processing closed)"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: E-003
      severity: operational
      text: "Partial cancellation (reduce amount vs full stop)"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: E-004
      severity: architectural
      text: "Pending mandate debit already in flight when cancel requested"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: AC-001
      severity: operational
      text: "Only ACTIVE SIPs can be cancelled"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: AC-004
      severity: architectural
      text: "PATCH /sip/{id}/cancel returns 200 with updated status"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: AC-007
      severity: regulatory
      text: "Cooling-off violation returns 422 with clear error message"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: AC-012
      severity: architectural
      text: "Concurrent cancel requests return idempotent response"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
  resolved: []

enforcement:
  questions_answered: []
  invariants: []

context:
  reads: [user-feature-request]
  writes: [.kiro/workspace/sip-cancellation/01-brs.md]
  system_context:
    - "SipService exists (create, pause, resume) — src/Services/SipService.cs"
    - "Sip entity: Id, SchemeCode, Amount, Frequency, Status, MandateId, CreatedAt"
    - "APIs: GET /api/sip, POST /api/sip, PATCH /api/sip/{id}/pause"
    - "IRtaGateway.SendCancellationAsync() — interface exists, no cancel impl"
    - "MandateService — lifecycle management, status checks"
  prior_decisions:
    - "ADR-004: All state changes use soft-delete + status enum"
    - "ADR-007: RTA calls async via RabbitMQ"
    - "ADR-011: All mutations require audit fields (createdBy, modifiedBy, timestamps)"

forward:
  focus:
    - "SEBI circular 2024/03 interpretation for digital-only cancellation"
    - "RTA SLA assumption (T+1) — verify with ops"
  blockers: []
  questions:
    - "Is AC-007 (cooling-off 422) consistent with SEBI circular wording?"
    - "Should partial cancellation (E-003) be Phase 1 or deferred?"
    - "What happens to linked switch transactions when SIP is cancelled?"

gaps:
  - "NRI cancellation — separate regulatory framework (Phase 2)"
  - "Tax implications for mid-year cancellation — needs CA input"

risks:
  - medium: "SEBI circular ambiguous on digital-only cancellation channel"
---
```

### Stage 2: devils-advocate → product-manager (needs-revision)

```yaml
---
schema: handoff/v3

routing:
  from: devils-advocate
  to: product-manager
  stage: 2
  stage_type: review
  feature: sip-cancellation
  timestamp: 2026-05-21T10:20:00+05:30

outcome:
  verdict: needs-revision
  summary: |
    Found 3 issues. AC-007 wording is wrong (cooling-off allows cancel, just no refund).
    Missing edge case: SIP with step-up scheduled. Missing constraint: linked switch
    transactions must be cancelled/blocked before SIP cancel completes.

critical:
  active:
    - id: C-001
      severity: regulatory
      text: "SEBI: 30-day cooling-off — can cancel but no refund of debited installments"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: C-002
      severity: operational
      text: "RTA cut-off 2PM IST — requests after cut-off process next business day"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: C-003
      severity: regulatory
      text: "Minimum 3 SIP installments completed before cancellation allowed"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: C-004
      severity: architectural
      text: "Mandate must be in ACTIVE state to process cancellation"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: C-005
      severity: architectural
      text: "Linked switch transactions must be cancelled before SIP cancel completes"
      added_by: devils-advocate
      added_stage: 2
      status: open
      proof: null
    - id: E-001
      severity: operational
      text: "Cancel request on SIP execution date (same day debit)"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: E-002
      severity: operational
      text: "Cancel during AMC/RTA holiday (processing closed)"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: E-003
      severity: operational
      text: "Partial cancellation (reduce amount vs full stop)"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: E-004
      severity: architectural
      text: "Pending mandate debit already in flight when cancel requested"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: E-005
      severity: operational
      text: "SIP with step-up scheduled — cancel before or after step-up applies?"
      added_by: devils-advocate
      added_stage: 2
      status: open
      proof: null
    - id: E-006
      severity: operational
      text: "Multiple SIPs in same scheme — cancel one, others unaffected"
      added_by: devils-advocate
      added_stage: 2
      status: open
      proof: null
    - id: AC-007
      severity: regulatory
      text: "Cooling-off violation returns 422 with clear error message"
      added_by: product-manager
      added_stage: 1
      status: ❌
      proof: "INCORRECT — cooling-off doesn't block cancel, it blocks refund. Revise AC."
  resolved: []

enforcement:
  questions_answered:
    - question: "Is AC-007 (cooling-off 422) consistent with SEBI circular wording?"
      answer: "NO — SEBI allows cancellation during cooling-off, just no refund. AC-007 should be about refund denial, not cancel denial."
      answered_by: devils-advocate
    - question: "Should partial cancellation (E-003) be Phase 1 or deferred?"
      answer: "Defer to Phase 2 — adds significant complexity, not in SEBI mandate"
      answered_by: devils-advocate
    - question: "What happens to linked switch transactions when SIP is cancelled?"
      answer: "Must be cancelled/blocked — added as C-005"
      answered_by: devils-advocate
  invariants: []

context:
  reads: [.kiro/workspace/sip-cancellation/01-brs.md]
  writes: [.kiro/workspace/sip-cancellation/02-review.md]

forward:
  focus:
    - "Revise AC-007: should reject REFUND during cooling-off, not CANCEL"
    - "Add handling for C-005 (linked switches) to BRS"
    - "Clarify E-005 (step-up) — does cancel apply to current or stepped-up amount?"
  blockers:
    - "AC-007 is marked ❌ — must be revised before pipeline can proceed"
  questions: []

gaps:
  - "NRI cancellation — separate regulatory framework (Phase 2)"
  - "Tax implications — needs CA input"
  - "Partial cancellation (E-003) — deferred Phase 2 per DA recommendation"

risks:
  - high: "AC-007 as written would BLOCK valid cancellations during cooling-off — regulatory risk"
  - medium: "Linked switch handling (C-005) may require SwitchService changes"
---
```

### Stage 5: architecture-reviewer → human (GATE)

```yaml
---
schema: handoff/v3

routing:
  from: architecture-reviewer
  to: human
  stage: 5
  stage_type: gate
  feature: sip-cancellation
  timestamp: 2026-05-21T11:00:00+05:30

outcome:
  verdict: blocked
  summary: |
    Two plans proposed. Plan A: extend SipService with CancelAsync + SwitchService
    check (4 days). Plan B: CancellationSaga with Temporal for orchestrated cancel
    including switch + RTA + mandate (7 days). Recommend Plan A — simpler, all
    critical items addressable, RTA async via existing queue.

critical:
  active:
    - id: C-005
      severity: architectural
      text: "Linked switch transactions must be cancelled before SIP cancel completes"
      added_by: devils-advocate
      added_stage: 2
      status: open
      proof: null
    - id: C-006
      severity: architectural
      text: "DB transaction required — status + audit + switch cancel must be atomic"
      added_by: architecture-reviewer
      added_stage: 5
      status: open
      proof: null
    - id: C-007
      severity: architectural
      text: "Idempotent endpoint — ETag or request deduplication required"
      added_by: architecture-reviewer
      added_stage: 5
      status: open
      proof: null
    - id: E-004
      severity: architectural
      text: "Pending mandate debit in flight when cancel requested"
      added_by: product-manager
      added_stage: 1
      status: open
      proof: null
    - id: E-007
      severity: architectural
      text: "Concurrent cancel requests — race condition on status update"
      added_by: architecture-reviewer
      added_stage: 5
      status: open
      proof: null
  resolved:
    - id: C-001
      text: "SEBI: 30-day cooling-off"
      status: ✅
      proof: "Both plans handle via CoolingOffValidator — allow cancel, deny refund"
      resolved_stage: 5
    - id: C-002
      text: "RTA cut-off 2PM"
      status: ✅
      proof: "Both plans use BusinessDaysCalendar.IsBeforeCutoff()"
      resolved_stage: 5
    - id: C-003
      text: "Min 3 installments"
      status: ✅
      proof: "Both plans check Sip.CompletedInstallments >= 3"
      resolved_stage: 5
    - id: C-004
      text: "Mandate ACTIVE"
      status: ✅
      proof: "Both plans call MandateService.IsActive()"
      resolved_stage: 5
    - id: AC-007
      text: "Cooling-off: deny refund, allow cancel (revised)"
      status: ✅
      proof: "Revised AC — both plans implement correctly"
      resolved_stage: 5

enforcement:
  questions_answered: []
  invariants:
    - "Human must select Plan A or Plan B before stage 6 begins"

context:
  reads:
    - .kiro/workspace/sip-cancellation/01-brs.md
    - .kiro/workspace/sip-cancellation/02-review.md
  writes:
    - .kiro/workspace/sip-cancellation/03-arch-plan.md
  snapshots:
    - label: "Existing pause pattern (cancel should follow same structure)"
      source: "SipService.cs:89-104"
      content: |
        public async Task<Result> PauseSipAsync(Guid sipId, string reason)
        {
            var sip = await _repository.GetByIdAsync(sipId);
            if (sip is null) return Result.Failure(SipErrors.NotFound);
            if (sip.Status != SipStatus.Active) return Result.Failure(SipErrors.InvalidStatus);
            sip.Pause(reason);
            await _unitOfWork.SaveChangesAsync();
            return Result.Success();
        }

forward:
  focus:
    - "Plan A: simpler, 4 days, couples cancel into SipService"
    - "Plan B: isolated saga, 7 days, better for future async workflows"
    - "Both handle all active critical items — choice is complexity vs isolation"
  blockers:
    - "Human must select Plan A or Plan B"
  questions:
    - "Optimistic or pessimistic concurrency for cancel status update?"
    - "Should RTA dispatch happen before or after DB commit?"
    - "Is Temporal justified for one workflow, or overkill?"

gaps:
  - "Partial cancellation (E-003) — deferred Phase 2"
  - "NRI cancellation — Phase 2"
  - "RTA webhook callback design — Phase 2 regardless of plan"

risks:
  - low: "Both plans use additive-only migration — safe rollback"
  - medium: "Plan A couples more logic into SipService (already 280 lines)"
---
```

### Stage 6: forge → reviewers (Human selected Plan A)

```yaml
---
schema: handoff/v3

routing:
  from: forge
  to: [amc-dotnet-reviewer, amc-security-reviewer]
  stage: 6
  stage_type: generate
  feature: sip-cancellation
  timestamp: 2026-05-21T12:00:00+05:30

outcome:
  verdict: complete
  summary: |
    Implemented Plan A. Extended SipService with CancelAsync(). PATCH endpoint added.
    Switch transaction check via ISwitchService. Optimistic concurrency via RowVersion.
    24/24 pre-written tests passing. Migration adds CancelledAt, CancellationReason, CancelledBy.

critical:
  active:
    - id: E-005
      severity: operational
      text: "SIP with step-up scheduled — cancel before or after step-up applies?"
      added_by: devils-advocate
      added_stage: 2
      status: ⏳
      proof: "Deferred — step-up cancel uses same flow, tested with current amount only"
  resolved:
    - id: C-001
      text: "SEBI 30-day cooling-off"
      status: ✅
      proof: "SipCancellationValidator.cs:42 + [test_cooling_off_allow_cancel, test_cooling_off_deny_refund]"
      resolved_stage: 6
    - id: C-002
      text: "RTA cut-off 2PM"
      status: ✅
      proof: "BusinessDaysCalendar.IsBeforeCutoff() + [test_before_cutoff, test_after_cutoff_next_day]"
      resolved_stage: 6
    - id: C-003
      text: "Min 3 installments"
      status: ✅
      proof: "SipCancellationValidator.cs:56 + [test_min_installments_reject, test_exactly_3_allow]"
      resolved_stage: 6
    - id: C-004
      text: "Mandate ACTIVE"
      status: ✅
      proof: "CancelAsync:L67 calls MandateService.IsActive() + [test_inactive_mandate_reject]"
      resolved_stage: 6
    - id: C-005
      text: "Linked switches cancelled before SIP cancel"
      status: ✅
      proof: "CancelAsync:L78 calls SwitchService.CancelPendingForSip() + [test_pending_switch_cancelled]"
      resolved_stage: 6
    - id: C-006
      text: "DB transaction atomic"
      status: ✅
      proof: "UnitOfWork wraps L60-L95 + [test_partial_failure_rollback]"
      resolved_stage: 6
    - id: C-007
      text: "Idempotent endpoint"
      status: ✅
      proof: "CancelAsync:L62 checks Status==Cancelled → returns 200 + [test_idempotent_cancel]"
      resolved_stage: 6
    - id: E-001
      text: "Cancel on execution date"
      status: ✅
      proof: "[test_same_day_cancel_before_cutoff, test_same_day_after_cutoff_queued]"
      resolved_stage: 6
    - id: E-002
      text: "Cancel during holiday"
      status: ✅
      proof: "BusinessDaysCalendar.NextBusinessDay() + [test_holiday_queued]"
      resolved_stage: 6
    - id: E-004
      text: "Pending mandate debit in flight"
      status: ✅
      proof: "CancelAsync:L72 checks MandateService.HasPendingDebit() + [test_pending_debit_blocks]"
      resolved_stage: 6
    - id: E-006
      text: "Multiple SIPs same scheme"
      status: ✅
      proof: "Cancel by SipId, not SchemeCode + [test_cancel_one_keep_others]"
      resolved_stage: 6
    - id: E-007
      text: "Concurrent cancel race condition"
      status: ✅
      proof: "RowVersion optimistic concurrency + [test_concurrent_cancel_one_wins]"
      resolved_stage: 6
    - id: AC-001
      text: "Only ACTIVE SIPs cancelled"
      status: ✅
      proof: "[test_cancel_active, test_cancel_paused_reject, test_cancel_completed_reject]"
      resolved_stage: 6
    - id: AC-004
      text: "PATCH returns 200"
      status: ✅
      proof: "[test_patch_returns_200_with_status]"
      resolved_stage: 6
    - id: AC-007
      text: "Cooling-off: deny refund, allow cancel"
      status: ✅
      proof: "[test_cooling_off_cancel_allowed, test_cooling_off_refund_denied]"
      resolved_stage: 6
    - id: AC-012
      text: "Idempotent concurrent response"
      status: ✅
      proof: "[test_idempotent_cancel, test_concurrent_same_result]"
      resolved_stage: 6

enforcement:
  questions_answered:
    - question: "Optimistic or pessimistic concurrency for cancel status update?"
      answer: "Optimistic — RowVersion column on Sip entity, DbUpdateConcurrencyException triggers retry (max 3)"
      answered_by: forge
    - question: "Should RTA dispatch happen before or after DB commit?"
      answer: "After commit — transactional outbox pattern. RtaMessage written to OutboxMessages table in same transaction, background worker dispatches."
      answered_by: forge
    - question: "Is Temporal justified for one workflow, or overkill?"
      answer: "N/A — Human selected Plan A (no Temporal)"
      answered_by: forge
  invariants:
    - "all critical.active items have status ✅ or ⏳"
    - "all ⏳ items appear in gaps"
    - "24/24 pre-written tests passing"

context:
  reads:
    - .kiro/workspace/sip-cancellation/03-arch-plan.md
    - .kiro/workspace/sip-cancellation/04-tests/
  writes:
    - .kiro/workspace/sip-cancellation/05-implementation/
    - src/Services/SipService.cs (modified — added CancelAsync)
    - src/Controllers/SipController.cs (modified — added PATCH cancel)
    - src/Validators/SipCancellationValidator.cs (new)
    - src/Models/Sip.cs (modified — +3 fields)
    - Migrations/20260521_AddCancellationFields.cs (new)

forward:
  focus:
    - "CancelAsync() state machine L60-L120 — complex branching"
    - "Optimistic concurrency retry logic L98-L108"
    - "Transactional outbox pattern — verify no orphan messages"
    - "SwitchService.CancelPendingForSip() — verify it doesn't cancel completed switches"
  blockers: []
  questions: []

gaps:
  - "E-003 partial cancellation — deferred Phase 2"
  - "E-005 step-up SIP — deferred, uses same cancel flow with current amount"
  - "AC-006 SMS/email notification — interface only, blocked on template"
  - "Dashboard history (AC-010) — frontend, separate PR"

risks:
  - medium: "No integration test for full RTA round-trip (outbox → queue → RTA)"
  - low: "SipService now 340 lines — approaching refactor threshold"
---
```

### Stage 7: amc-dotnet-reviewer → forge (finds bug)

```yaml
---
schema: handoff/v3

routing:
  from: amc-dotnet-reviewer
  to: forge
  stage: 7
  stage_type: review
  feature: sip-cancellation
  timestamp: 2026-05-21T13:00:00+05:30

outcome:
  verdict: needs-revision
  summary: |
    Found 1 BLOCKER: E-004 marked ✅ but implementation is incomplete — checks
    HasPendingDebit() but doesn't handle the case where debit SUCCEEDS after cancel
    is initiated (race window). Also 1 WARNING: outbox dispatch happens outside
    UnitOfWork scope. 1 SUGGESTION: CancellationReason should be string with
    validation, not hard enum.

critical:
  active:
    - id: E-004
      severity: architectural
      text: "Pending mandate debit in flight when cancel requested"
      added_by: product-manager
      added_stage: 1
      status: ❌
      proof: "INCOMPLETE — HasPendingDebit() only checks at point-in-time. Race window: debit can succeed AFTER check passes but BEFORE cancel commits. Need distributed lock or compensating transaction."
    - id: E-005
      severity: operational
      text: "SIP with step-up scheduled"
      added_by: devils-advocate
      added_stage: 2
      status: ⏳
      proof: "Deferred Phase 2"
  resolved:
    - id: C-001
      text: "SEBI 30-day cooling-off"
      status: ✅
      proof: "SipCancellationValidator.cs:42 — verified correct"
      resolved_stage: 6
    - id: C-005
      text: "Linked switches cancelled"
      status: ✅
      proof: "CancelAsync:L78 — verified SwitchService call is within transaction"
      resolved_stage: 6
    - id: C-006
      text: "DB transaction atomic"
      status: ✅
      proof: "UnitOfWork scope verified L60-L95 — BUT outbox write is OUTSIDE (see risks)"
      resolved_stage: 6
    - id: C-007
      text: "Idempotent endpoint"
      status: ✅
      proof: "Verified — status check at L62 prevents double-processing"
      resolved_stage: 6
    - id: E-007
      text: "Concurrent cancel race"
      status: ✅
      proof: "RowVersion verified — DbUpdateConcurrencyException handled correctly"
      resolved_stage: 6

enforcement:
  questions_answered: []
  invariants:
    - "count(critical.active where status=❌) > 0 → BLOCKER"

context:
  reads:
    - .kiro/workspace/sip-cancellation/05-implementation/
    - src/Services/SipService.cs
    - src/Controllers/SipController.cs
    - src/Validators/SipCancellationValidator.cs
  writes:
    - .kiro/workspace/sip-cancellation/06-review.md

forward:
  focus:
    - "E-004 FIX: Add Redis distributed lock on MandateId before cancel flow, OR add compensating transaction that reverses cancel if debit succeeds"
    - "WARNING: Move outbox message write INSIDE UnitOfWork.SaveChangesAsync() scope (L95 → L93)"
  blockers:
    - "E-004 is ❌ — must fix race condition between mandate debit and cancel"
  questions:
    - "Which approach for E-004: distributed lock or compensating transaction?"

gaps:
  - "E-003 partial cancellation — deferred Phase 2 (acknowledged)"
  - "E-005 step-up — deferred (acknowledged)"

risks:
  - high: "E-004 race window could result in cancelled SIP with successful debit — investor loses money"
  - medium: "Outbox outside transaction — failed commit leaves orphan RTA message in queue"
  - low: "CancellationReason enum limits future extensibility"
---
```

## Orchestrator Logic

The orchestrator reads YAML frontmatter only — never the full file content.

### Routing Decision Tree

```
1. Parse routing.stage_type:
   gate     → STOP, present outcome.summary + forward to human
   review   → check outcome.verdict
   generate → check outcome.verdict
   resolve  → re-run target stage with forward.blockers as input

2. Parse outcome.verdict:
   complete/approved → advance to routing.to
   needs-revision   → route back to previous stage (max 2 loops, then escalate)
   rejected         → STOP, escalate to human
   blocked          → STOP, show forward.blockers

3. Validate enforcement:
   - If forward.questions existed in stage N, verify stage N+1 has matching
     enforcement.questions_answered entries. Block if missing.
   - Evaluate enforcement.invariants. Block if any fails.

4. Compute confidence (replaces self-reported):
   - count(critical.active where status=❌) > 0 → BLOCKED
   - count(critical.active where status=open) > 0 → IN PROGRESS
   - all items ✅ or ⏳ → READY TO ADVANCE
```

### Pipeline Coverage Report (Auto-Generated at Final Stage)

```markdown
## Coverage Report — sip-cancellation
═══════════════════════════════════════

Constraints:  7/7 resolved (5 ✅, 2 ✅ via architecture)
Edge Cases:   5/7 resolved (5 ✅, 1 ⏳ approved, 1 ❌ BLOCKER)
Acceptance:   10/12 resolved (10 ✅, 2 ⏳ approved)

❌ BLOCKERS (pipeline cannot complete):
  - E-004: Pending mandate debit race condition — needs fix

⏳ DEFERRED (human-approved):
  - E-003: Partial cancellation (Phase 2)
  - E-005: Step-up SIP (Phase 2)
  - AC-006: Notifications (blocked on template)
  - AC-010: Dashboard (frontend PR)

VERDICT: 🔴 BLOCKED — 1 critical item unresolved
```

## Token Optimization Guidance

The protocol is designed for minimal token consumption without sacrificing completeness.

**Principles (not hard limits):**
- **Pointers over payloads** — reference file paths, don't inline content
- **Active/resolved split** — downstream agents only need `active` items in full; `resolved` can be summarized as a count
- **Snapshots are surgical** — max 3, pick the most relevant patterns
- **Let complexity dictate size** — a 2-entity CRUD needs fewer critical items than a regulatory workflow
- **Omit empty optional fields** — don't include `snapshots`, `prior_decisions`, or `questions` if not relevant

**Anti-patterns:**
- ❌ Inlining full code blocks (use file paths + snapshots for key patterns only)
- ❌ Repeating the entire BRS in summary
- ❌ Including all resolved items in full when only active items matter
- ❌ Adding questions that don't need explicit answers (use `focus` instead)

**Scaling guidance:**
- Under 15 critical items → flat list works fine
- 15-30 items → active/resolved split keeps it manageable
- 30+ items → group by severity (regulatory first, then architectural, then operational)
- If resolved section exceeds 20 items → collapse to summary: `"resolved: 22 items (see stages 1-5)"`

## When to Use This Protocol

**Use it for:**
- Multi-agent pipelines (feature-pipeline, fullstack-orchestrator)
- Any workflow with 3+ stages
- Regulated features requiring audit trails
- Features where multiple agents build on each other's work

**Skip it for:**
- Single-agent tasks (debug, explain, refactor)
- One-shot code generation with no review loop
- Documentation-only changes

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-05-21 | Initial — flat critical list, self-reported confidence |
| v2.0 | 2026-05-21 | Added summary, forward.questions, system_context |
| v2.2 | 2026-05-21 | Added (new) prefix, ✅ markers, confidence rubric |
| v3.0 | 2026-05-21 | Tiered critical (active/resolved), enforcement block, context snapshots, removed self-reported confidence |
