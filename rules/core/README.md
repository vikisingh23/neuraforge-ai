# Core Rules

## Naming Conventions
- **Classes/Components**: PascalCase (`TransactionService`, `UserProfile`)
- **Variables/Functions**: camelCase (`getUserById`, `transactionList`)
- **Files**: kebab-case (`.ts/.tsx`) or snake_case (`.dart`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Booleans**: prefix with is/has/should (`isLoading`, `hasError`)
- **Descriptive names**: `getTransactionsByUserId` not `getData`
- **API URL paths**: always lowercase-hyphenated (kebab-case) — `/api/v1/bank-accounts`, `/api/v1/transaction-history`, NOT `/api/v1/BankAccounts` or `/api/v1/bankAccounts`. Applies to ALL stacks.

## Git Workflow
- Branch naming: `feature/`, `bugfix/`, `hotfix/` prefix
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- No direct push to main — always PR/MR
- Squash merge for feature branches

## Architecture Principles
1. Thin controllers — HTTP/UI concerns only
2. Reuse existing → extend → refactor god classes → create new
3. Single responsibility with line limits
4. Repository encapsulates all data access
5. Composition over inheritance
