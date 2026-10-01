# NestJS Anti-Patterns

Confirmed mistakes from real usage. The `nestjs-forge` / `nestjs-reviewer` agents
load this file before generating or reviewing NestJS code.

---

## Anti-Patterns

### [AP-001] Never use string for monetary decimal columns
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```typescript
@Column('float')
amount: number;
```
**Correct approach:**
```typescript
@Column('decimal', { precision: 18, scale: 4 })
amount: string;  // TypeORM returns decimal as string — parse in service layer
```
**Rule:** Use `decimal(18,4)` column type. TypeORM returns it as a string — convert to `Decimal.js` or `big.js` in the service layer for arithmetic. Never use `float` or `number` directly.

---

### [AP-002] Never skip ValidationPipe on DTOs
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```typescript
// DTO with no decorators
export class CreateOrderDto {
  customerId: number;
  amount: string;
}
```
**Correct approach:**
```typescript
export class CreateOrderDto {
  @IsInt()
  @IsPositive()
  customerId: number;

  @IsDecimal({ decimal_digits: '0,4' })
  amount: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}
```
**Rule:** Every DTO field must have class-validator decorators. `ValidationPipe` must be enabled globally. Never trust unvalidated input.

---

### [AP-003] Always register entities in the module's TypeORM imports
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```typescript
// Missing entity registration causes "Repository not found" errors
@Module({
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
```
**Correct approach:**
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
```
**Rule:** Every entity used in a module must be registered via `TypeOrmModule.forFeature([Entity])`.

---

### [AP-004] Avoid circular dependency in DI — use forwardRef as last resort
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```typescript
// ServiceA depends on ServiceB, ServiceB depends on ServiceA → circular DI crash
constructor(private serviceA: ServiceA) {}
```
**Correct approach:**
Restructure to extract shared logic into a third `CommonService`. If truly unavoidable:
```typescript
constructor(@Inject(forwardRef(() => ServiceA)) private serviceA: ServiceA) {}
```
**Rule:** Circular DI is an architecture smell. Extract shared logic. Use `forwardRef` only as a last resort.

---

<!-- New anti-patterns are added here via: npm run feedback:submit -->
