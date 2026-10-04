# Minimal Solution Principle

Every forge agent MUST run this check before writing code, not after. Inspired by
[Ponytail](https://github.com/DietrichGebert/ponytail) (MIT) — adapted here to
neuraforge's own non-negotiables rather than copied wholesale.

The best code is the code you didn't have to write. Every line, file, and
abstraction is something a future developer has to read, test, and maintain —
so it needs to earn its place, not just be "nice to have."

## The Ladder

Work down this list before generating anything. Stop at the first step that
resolves the request.

1. **Does this need to exist?** — Re-read the request. Don't add fields,
   endpoints, or config options that weren't asked for "just in case."
2. **Does it already exist in this codebase?** — Search first (see the Reuse
   Decision Tree in `ARCHITECTURE_PRINCIPLES.md`; use the `codebase-graph`
   skill if available for anything beyond a trivial grep).
3. **Does the framework/stdlib already do this?** — Don't hand-roll pagination,
   validation, or retry logic that EF Core / TypeORM / DRF / Spring Data /
   React Query / Riverpod already provides.
4. **Is there an already-approved dependency that solves it?** — Check
   `package.json` / `.csproj` / `requirements.txt` / `pubspec.yaml` before
   reaching for a new package.
5. **Can the existing file/function absorb this?** — One more parameter beats
   one more file. One more file beats one more layer of abstraction.
6. **Ship the minimum that satisfies the actual requirement** — no speculative
   options, no config flags for hypothetical future needs, no "while I'm here"
   additions.

## Never Skip These for "Minimal"

Minimalism never trades away the things that make code production-safe. These
stay mandatory regardless of how small the request is:

- Audit fields, soft deletes (see `ARCHITECTURE_PRINCIPLES.md` §8)
- `decimal` for monetary values — never float/double
- Input validation at trust boundaries
- Idempotency on mutation endpoints handling money (§10)
- Pagination on list endpoints (§9)
- Auth/authorization checks
- Loading / error / empty states on data-driven UI

## When the Minimal Version Isn't Enough

If the request is genuinely complex, ship the smallest version that's
*correct*, then say so in one line: "This covers the base case — want me to
also handle [edge case / scale concern]?" Let the user opt into more scope
instead of assuming it.

## Marking Deliberate Trade-offs

If you simplified something a reviewer might otherwise flag, say why inline —
this is the one case where a comment earns its place:

```ts
// lean: single query here handles current scale (<10k rows); revisit with
// a materialized view if this table grows past that.
```

Don't use this to excuse skipping anything in the "never skip" list above —
it's for documenting a scope trade-off, not a shortcut around a non-negotiable.

## Why This Matters

Every unused abstraction, speculative config flag, and premature layer is a
support burden for whoever maintains this code next — usually not the person
who generated it. "Reuse → Extend → Refactor → Create" (the Reuse Decision
Tree) tells you where to look before writing anything; this file tells you how
little to write once you've confirmed nothing existing covers it.
