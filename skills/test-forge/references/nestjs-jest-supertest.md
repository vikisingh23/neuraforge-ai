# NestJS (Jest + supertest) — templates

Loaded on demand by the `test-forge` agent. Moved out of `agents/test-forge.md` so the agent prompt stays small.

## Template 1

```typescript
describe('TransactionService', () => {
  let service: TransactionService;
  let repo: jest.Mocked<TransactionRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TransactionService,
        { provide: TransactionRepository, useValue: createMock<TransactionRepository>() },
        { provide: EventEmitter2, useValue: createMock<EventEmitter2>() },
      ],
    }).compile();
    service = module.get(TransactionService);
    repo = module.get(TransactionRepository);
  });

  it('should return paginated transactions', async () => {
    repo.findByInvestorId.mockResolvedValue([[mockTransaction], 1]);
    const result = await service.findAll('inv-1', { page: 1, pageSize: 10 });
    expect(result.items).toHaveLength(1);
    expect(result.totalCount).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('should throw NotFoundException for missing transaction', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
  });

  it('should set audit fields on create', async () => {
    repo.create.mockResolvedValue(mockTransaction);
    await service.create(mockDto, 'user-1');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: 'user-1', modifiedBy: 'user-1' }),
    );
  });

  it('should soft delete, not hard delete', async () => {
    repo.findById.mockResolvedValue(mockTransaction);
    await service.softDelete('txn-1', 'user-1');
    expect(repo.softDelete).toHaveBeenCalledWith('txn-1', 'user-1');
  });
});
```

## Template 2

```typescript
describe('TransactionController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TransactionRepository).useValue(mockRepo)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  it('POST /api/v1/transactions — 201 with valid data', () =>
    request(app.getHttpServer())
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ schemeName: 'Test Fund', amount: 5000, investorId: 'inv-1' })
      .expect(201));

  it('POST /api/v1/transactions — 422 with amount below minimum', () =>
    request(app.getHttpServer())
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ schemeName: 'Test Fund', amount: 100, investorId: 'inv-1' })
      .expect(422));

  it('GET /api/v1/transactions — 401 without auth', () =>
    request(app.getHttpServer())
      .get('/api/v1/transactions')
      .expect(401));

  afterAll(() => app.close());
});
```
