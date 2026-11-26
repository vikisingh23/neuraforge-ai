# Frontend Rules

## Data Fetching
- React: React Query mandatory for all GET requests
- React Native: React Query + typed navigation
- Flutter: Riverpod providers for all server state
- NEVER useState/setState for API data

## Component Architecture
- Data fetching at the leaf level — each component fetches its own data
- Reuse existing components — search codebase first, refactor god components
- Single responsibility: components <150 lines, screens <50 lines (Flutter)
- Composition over configuration — small focused pieces, not mega-components

## UX States (mandatory on every screen)
- Loading: skeleton loaders, never blank screens
- Empty: helpful message with CTA
- Error: user-friendly message with retry action
- Offline: graceful degradation, cached data with "Last updated"

## Accessibility
- Proper labels (aria-label, accessibilityLabel, Semantics)
- Minimum touch targets: 44x44px (iOS) / 48x48px (Material)
- Color contrast: WCAG AA minimum
- Keyboard/screen reader navigation

## React Native Platform Baseline
- Target the latest stable React Native minus at most 2 minors (0.88 as of November 2026). Upgrade one minor at a time with the Upgrade Helper
- New Architecture only. Confirm each native module supports it before adding
- Hermes is the JS engine
- Tokens in Keychain/Keystore, never AsyncStorage. Certificate pinning for auth and payment APIs. Treat deep-link and intent parameters as untrusted input
- Lock files committed, `npm ci` in CI, review native module additions (they run with full app privileges)

## React Platform Baseline

- **Versions**: React 19.3 for new work. Never run below the patched lines 19.0.1, 19.1.2 or 19.2.1 (critical Server Components remote code execution, Dec 2025). Frameworks that bundle Server Components need their vendor's patched release.
- **Server Components / Server Functions**: treat every Server Function as a public endpoint. Validate input, authenticate and authorize on every call, and never trust closed-over values.
- **React Compiler 1.0 (stable)**: enable it for new apps and run its ESLint rules. Do not add `useMemo`, `useCallback` or `React.memo` by default. Add them only where profiling shows a need, or where an API needs a stable identity. Keep existing manual memoization until the compiler has been verified on that code.
- **React 19.3**: View Transitions and Fragment Refs are available. It also adds Trusted Types support: evaluate a CSP with `require-trusted-types-for 'script'` for apps that can support it.
- **TypeScript 7.x** with `strict` on. Run the typecheck gate on every change.
