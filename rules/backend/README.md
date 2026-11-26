# Backend Rules

## Repository Pattern
- All database access through repository interfaces
- Interface + implementation separation
- No ORM context injected directly into services or controllers
- Unit of Work for multi-entity transactions

## API Design
- Consistent response envelope: `{ statusCode, message, data, timestamp }`
- Pagination on ALL list endpoints — never return unbounded collections
- Proper HTTP status codes: 201 create, 204 delete, 409 conflict, 422 validation
- API versioning: `/api/v1/` prefix
- **URL naming: always lowercase-hyphenated (kebab-case)** — `/api/v1/bank-accounts`, `/api/v1/transaction-history`, NOT `/api/v1/BankAccounts` or `/api/v1/bankAccounts`
- **Resource names: plural nouns** — `/api/v1/orders` not `/api/v1/order`
- **Sub-resources: nested with hyphens** — `/api/v1/investor-profiles/{id}/bank-accounts`
- This applies to ALL stacks: .NET, NestJS, Django, Spring Boot

## Audit & Compliance
- ALL entities: `createdBy`, `modifiedBy`, `createdAt`, `modifiedAt`
- Soft deletes mandatory: `isDeleted`, `deletedAt`, `deletedBy`
- `decimal` for money — never `float`/`double`
- Idempotency on mutation endpoints (POST creating financial records)

## Error Handling
- Global exception filter/middleware
- Domain-specific exception types
- No swallowed exceptions (empty catch blocks)
- No sensitive data in error responses
- Human-readable validation messages

## Modern .NET Baseline (new services: .NET 10 LTS)
Keep an existing service's `TargetFramework` unless an upgrade is planned.
- Project: `<Nullable>enable</Nullable>`, `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`, NuGet audit on (`<NuGetAuditMode>all</NuGetAuditMode>` includes transitive packages)
- Packages: Central Package Management (`Directory.Packages.props`), lock files, NuGet package source mapping
- Errors: `AddProblemDetails()` plus an `IExceptionHandler` returning RFC 9457 `application/problem+json`. No stack traces to clients. Fail closed
- OpenAPI: built-in `Microsoft.AspNetCore.OpenApi` rather than Swashbuckle for new services
- Caching: `HybridCache` rather than hand-layered `IMemoryCache` + `IDistributedCache`
- Time: inject `TimeProvider`, no `DateTime.UtcNow` in business logic
- Rate limiting: built-in `AddRateLimiter` policies, stricter on login and OTP endpoints
- Every public async method takes a `CancellationToken` and passes it down
- Authorization by default (fallback policy requires an authenticated user), plus ownership checks in handlers
- Libraries with commercial terms in recent majors (AutoMapper, MediatR, MassTransit, FluentAssertions): check the licence before upgrading; prefer explicit mapping and plain handlers for new code
- Done = `dotnet build -warnaserror`, `dotnet test` and `dotnet list package --vulnerable --include-transitive` are clean
