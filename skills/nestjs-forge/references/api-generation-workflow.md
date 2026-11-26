# 🎯 API Generation Workflow (MANDATORY) — templates

Loaded on demand by the `nestjs-forge` agent. Moved out of `agents/nestjs-forge.md` so the agent prompt stays small.

## Template 1

```typescript
// entities/transaction.entity.ts
@Entity('om_transaction_mf')
export class Transaction extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  schemeName: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: TransactionStatus })
  status: TransactionStatus;

  @Column({ type: 'varchar', length: 50 })
  investorId: string;

  // MANDATORY audit fields
  @Column()
  createdBy: string;

  @Column()
  modifiedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  modifiedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;

  @Column({ nullable: true })
  deletedBy: string;

  // Optimistic concurrency
  @VersionColumn()
  version: number;
}
```

## Template 2

```typescript
// dto/create-transaction.dto.ts
export class CreateTransactionDto {
  @ApiProperty({ description: 'Scheme name', example: 'your company Flexi Cap Fund' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  schemeName: string;

  @ApiProperty({ description: 'Amount in INR', minimum: 500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(500, { message: 'Minimum transaction amount is ₹500' })
  amount: number;

  @ApiProperty({ description: 'Investor ID' })
  @IsUUID()
  investorId: string;
}

// dto/transaction-response.dto.ts
export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  schemeName: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  status: TransactionStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  modifiedAt: Date;
}

// dto/paginated-response.dto.ts
export class PaginatedResponseDto<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

## Template 3

```typescript
// repositories/transaction.repository.ts
@Injectable()
export class TransactionRepository {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
  ) {}

  async findByInvestorId(
    investorId: string,
    pagination: PaginationDto,
  ): Promise<[Transaction[], number]> {
    return this.repo.findAndCount({
      where: { investorId, isDeleted: false },
      order: { createdAt: 'DESC' },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    });
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.repo.findOne({ where: { id, isDeleted: false } });
  }

  async create(entity: DeepPartial<Transaction>): Promise<Transaction> {
    return this.repo.save(this.repo.create(entity));
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.repo.update(id, { isDeleted: true, deletedAt: new Date(), deletedBy });
  }
}
```

## Template 4

```typescript
// services/transaction.service.ts
@Injectable()
export class TransactionService {
  constructor(
    private readonly transactionRepo: TransactionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    investorId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<TransactionResponseDto>> {
    const [items, totalCount] = await this.transactionRepo.findByInvestorId(
      investorId, pagination,
    );
    return {
      items: items.map(this.toResponseDto),
      totalCount,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(totalCount / pagination.pageSize),
    };
  }

  async create(dto: CreateTransactionDto, userId: string): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepo.create({
      ...dto,
      status: TransactionStatus.PENDING,
      createdBy: userId,
      modifiedBy: userId,
    });
    this.eventEmitter.emit('transaction.created', transaction);
    return this.toResponseDto(transaction);
  }

  async findById(id: string): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepo.findById(id);
    if (!transaction) throw new NotFoundException(`Transaction ${id} not found`);
    return this.toResponseDto(transaction);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const exists = await this.transactionRepo.findById(id);
    if (!exists) throw new NotFoundException(`Transaction ${id} not found`);
    await this.transactionRepo.softDelete(id, userId);
  }

  private toResponseDto(entity: Transaction): TransactionResponseDto {
    return plainToInstance(TransactionResponseDto, entity, { excludeExtraneousValues: true });
  }
}
```

## Template 5

```typescript
// controllers/transaction.controller.ts
@ApiTags('Transactions')
@Controller('api/v1/transactions')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ResponseInterceptor)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  @ApiOperation({ summary: 'List transactions by investor' })
  @ApiOkResponse({ type: PaginatedResponseDto })
  async findAll(
    @Query('investorId') investorId: string,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<TransactionResponseDto>> {
    return this.transactionService.findAll(investorId, pagination);
  }

  @Post()
  @ApiOperation({ summary: 'Create transaction' })
  @ApiCreatedResponse({ type: TransactionResponseDto })
  @UseGuards(IdempotencyGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TransactionResponseDto> {
    return this.transactionService.create(dto, user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<TransactionResponseDto> {
    return this.transactionService.findById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete transaction' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.transactionService.softDelete(id, user.sub);
  }
}
```

## Template 6

```typescript
// __tests__/transaction.service.spec.ts
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
    const result = await service.findAll('investor-1', { page: 1, pageSize: 10 });
    expect(result.items).toHaveLength(1);
    expect(result.totalCount).toBe(1);
  });

  it('should throw NotFoundException for missing transaction', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
  });

  it('should create transaction with audit fields', async () => {
    repo.create.mockResolvedValue(mockTransaction);
    const result = await service.create(mockCreateDto, 'user-1');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 'user-1' }));
  });
});
```
