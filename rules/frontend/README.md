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
