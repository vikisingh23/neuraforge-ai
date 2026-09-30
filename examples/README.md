# Examples — Generated Output Samples

Each folder shows what NeuraForge agents actually generate for a "CRUD API for Orders" prompt.
Use these to evaluate output quality before installing, or as a baseline when contributing improvements.

## Prompt used

```
Build a CRUD API for an Order entity. Fields: customerId, amount, status, notes.
Include pagination, soft deletes, and audit fields.
```

## Folders

| Folder | Agent | Stack |
|--------|-------|-------|
| `dotnet/` | `forge` / `dotnet-forge` | .NET Core 8 + EF Core + PostgreSQL |
| `nestjs/` | `nestjs-forge` | NestJS + TypeORM + PostgreSQL |
| `react/` | `react-forge` | React + React Query + Vite |
| `react-native/` | `rn-forge` | React Native + React Query |
| `flutter/` | `flutter-forge` | Flutter + Riverpod |
| `django/` | `django-forge` | Django + DRF |
| `spring/` | `spring-forge` | Spring Boot + JPA |

## What the agents generate (not shown here)

These examples show a representative subset. The full agent output also includes:
- Database migration files
- Unit + integration tests
- Swagger/OpenAPI annotations
- Docker and CI/CD config (via `/devops`)
- Postman collection (via sentinel agent)

## Notes

- All monetary `amount` fields use `decimal` — never `float` or `double`
- All entities have audit fields: `createdBy`, `modifiedBy`, `createdAt`, `modifiedAt`
- All list endpoints paginate (default 20, max 100)
- Deletes are soft (`isDeleted` flag) — no hard deletes
- These files are generated outputs, not hand-written — they show real agent quality
