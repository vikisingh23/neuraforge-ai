# Architecture Principles (CRITICAL) — templates

Loaded on demand by the `nestjs-forge` agent. Moved out of `agents/nestjs-forge.md` so the agent prompt stays small.

## Template 1

Controllers handle HTTP only. All business logic in services.

```typescript
// ❌ WRONG — Business logic in controller
@Post()
async create(@Body() dto: CreateTransactionDto) {
  const existing = await this.repo.findOne({ where: { idempotencyKey: dto.key } });
  if (existing) throw new ConflictException();
  const entity = this.repo.create(dto);
  entity.status = TransactionStatus.PENDING;
  // 20 more lines of business logic...
  return this.repo.save(entity);
}

// ✅ CORRECT — Controller delegates
@Post()
async create(@Body() dto: CreateTransactionDto, @CurrentUser() user: JwtPayload) {
  return this.transactionService.create(dto, user.sub);
}
```

## Template 2

No `Repository<Entity>` injected directly into services. Wrap in custom repository.

```typescript
// ❌ WRONG — Deep inheritance
class BaseService → FinancialService → MutualFundService → SIPService

// ✅ CORRECT — Compose via DI
@Injectable()
export class SIPService {
  constructor(
    private readonly schemeRepo: SchemeRepository,
    private readonly paymentService: PaymentService,
    private readonly validationService: ValidationService,
  ) {}
}
```
