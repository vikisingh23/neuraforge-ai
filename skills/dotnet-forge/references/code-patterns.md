# Forge Code Patterns

Loaded on demand by the `forge` agent. Moved out of `agents/forge.md` so the agent prompt stays small.

### 1. Program.cs Setup

```csharp
var builder = WebApplication.CreateBuilder(args);

// Sentry configuration
builder.Services.AddSentryConfiguration(builder, builder.Configuration);

// Database with interceptors
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
           .AddInterceptors(new TimestampSaveChangesInterceptor()));

// Npgsql JSON support
NpgsqlConnection.GlobalTypeMapper.UseJsonNet();

// AutoMapper & FluentValidation
var assembly = typeof(Program).Assembly;
builder.Services.AddAutoMapper(assembly);
builder.Services.AddValidatorsFromAssembly(assembly);

// Serilog to MongoDB
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Async(a => a.MongoDB(
        builder.Configuration.GetConnectionString("MongoDB"),
        collectionName: "logs",
        batchPostingLimit: 1000),
    bufferSize: 50000,
    blockWhenFull: false)
    .CreateLogger();

// JWT with RSA
builder.Services.AddSingleton<RsaTokenProvider>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = rsaTokenProvider.AccessTokenValidationParameters;
    });

// Redis
builder.Services.AddSingleton<IConnectionMultiplexer>(sp => {
    var configuration = builder.Configuration.GetConnectionString("Redis");
    return ConnectionMultiplexer.Connect(configuration);
});

// Hangfire
builder.Services.AddHangfire(configuration => configuration
    .UsePostgreSqlStorage(builder.Configuration.GetConnectionString("DefaultConnection")));

// DataLog for audit
builder.Services.AddDataLog<AppDbContext>(builder.Configuration);

// Register repositories and services
builder.Services.AddRepositoriesAndServices(Assembly.GetExecutingAssembly());

// Custom filters
builder.Services.AddControllers(options => {
    options.Filters.Add<TrimStringsActionFilter>();
    options.Filters.Add<FluentValidationFilter>();
});
```

### 2. Entity Pattern

```csharp
public class TransactionMF : ITimestampedEntity
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string TransactionId { get; set; } = string.Empty;
    
    [Required]
    public long InvestorId { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }
    
    [Column(TypeName = "jsonb")]
    public string? HolderDetails { get; set; }
    
    [MaxLength(20)]
    public string? DistributorCode { get; set; }
    
    [MaxLength(10)]
    public string? DistributorType { get; set; }
    
    // Audit fields
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    [MaxLength(100)]
    public string? DlPKey { get; set; } // DataLake primary key
}
```

### 3. Repository Pattern

```csharp
public interface ITransactionRepository : IRepository<TransactionMF>
{
    Task<TransactionMF?> GetByTransactionIdAsync(string transactionId);
    Task<List<TransactionMF>> GetByInvestorIdAsync(long investorId);
}

public class TransactionRepository : BaseRepository<TransactionMF>, ITransactionRepository
{
    public TransactionRepository(AppDbContext context) : base(context) { }
    
    public async Task<TransactionMF?> GetByTransactionIdAsync(string transactionId)
    {
        return await _dbSet
            .FirstOrDefaultAsync(t => t.TransactionId == transactionId)
            .ConfigureAwait(false);
    }
    
    public async Task<List<TransactionMF>> GetByInvestorIdAsync(long investorId)
    {
        return await _dbSet
            .Where(t => t.InvestorId == investorId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync()
            .ConfigureAwait(false);
    }
}
```

### 4. Service Pattern

```csharp
public interface ITransactionService
{
    Task<Result<TransactionMF>> CreateTransactionAsync(CreateTransactionDto dto);
    Task<Result<TransactionMF>> GetTransactionAsync(string transactionId);
}

public class TransactionService : ITransactionService
{
    private readonly ITransactionRepository _transactionRepository;
    private readonly ILogger<TransactionService> _logger;
    private readonly IMapper _mapper;
    
    public TransactionService(
        ITransactionRepository transactionRepository,
        ILogger<TransactionService> logger,
        IMapper mapper)
    {
        _transactionRepository = transactionRepository;
        _logger = logger;
        _mapper = mapper;
    }
    
    public async Task<Result<TransactionMF>> CreateTransactionAsync(CreateTransactionDto dto)
    {
        try
        {
            var transaction = _mapper.Map<TransactionMF>(dto);
            
            await _transactionRepository.AddAsync(transaction).ConfigureAwait(false);
            await _transactionRepository.SaveChangesAsync().ConfigureAwait(false);
            
            _logger.LogInformation("Transaction created: {TransactionId}", transaction.TransactionId);
            
            return Result<TransactionMF>.Success(transaction);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating transaction");
            return Result<TransactionMF>.Failure("Failed to create transaction");
        }
    }
}
```

### 5. Controller Pattern

```csharp
[ApiController]
[Route("api/transactions")]  // lowercase-hyphenated, NOT [controller] which gives PascalCase
[Authorize]
public class TransactionController : ControllerBase
{
    private readonly ITransactionService _transactionService;
    private readonly ILogger<TransactionController> _logger;
    
    public TransactionController(
        ITransactionService transactionService,
        ILogger<TransactionController> logger)
    {
        _transactionService = transactionService;
        _logger = logger;
    }
    
    [HttpPost]
    [ProducesResponseType(typeof(APIResponse<TransactionMF>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(APIResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateTransaction([FromBody] CreateTransactionDto dto)
    {
        var result = await _transactionService.CreateTransactionAsync(dto);
        
        if (!result.IsSuccess)
        {
            return BadRequest(APIResponse<object>.ErrorResponse(result.Error));
        }
        
        return Ok(APIResponse<TransactionMF>.SuccessResponse(result.Value));
    }
    
    [HttpGet("{transactionId}")]
    public async Task<IActionResult> GetTransaction(string transactionId)
    {
        var result = await _transactionService.GetTransactionAsync(transactionId);
        
        if (!result.IsSuccess)
        {
            return NotFound(APIResponse<object>.ErrorResponse(result.Error));
        }
        
        return Ok(APIResponse<TransactionMF>.SuccessResponse(result.Value));
    }
}
```

### 6. DbContext Pattern

```csharp
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    
    public DbSet<TransactionMF> TransactionsMF { get; set; }
    public DbSet<BankAccountMandateMF> BankAccountMandatesMF { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Table naming
        modelBuilder.Entity<TransactionMF>().ToTable("om_transaction_mf");
        
        // Indexes
        modelBuilder.Entity<TransactionMF>()
            .HasIndex(t => t.TransactionId)
            .IsUnique();
            
        modelBuilder.Entity<TransactionMF>()
            .HasIndex(t => t.InvestorId);
            
        modelBuilder.Entity<TransactionMF>()
            .HasIndex(t => t.DlPKey)
            .IsUnique()
            .HasFilter("\"DlPKey\" IS NOT NULL");
        
        // Sequences for custom IDs
        modelBuilder.HasSequence<long>("transaction_id_seq")
            .StartsAt(1000)
            .IncrementsBy(1);
    }
}
```

### 7. FluentValidation Pattern

```csharp
public class CreateTransactionDtoValidator : AbstractValidator<CreateTransactionDto>
{
    public CreateTransactionDtoValidator()
    {
        RuleFor(x => x.InvestorId)
            .GreaterThan(0)
            .WithMessage("InvestorId must be greater than 0");
            
        RuleFor(x => x.Amount)
            .GreaterThan(0)
            .WithMessage("Amount must be greater than 0");
            
        RuleFor(x => x.DistributorCode)
            .MaximumLength(20)
            .When(x => !string.IsNullOrEmpty(x.DistributorCode));
    }
}
```

### 8. Hangfire Job Pattern

```csharp
public class TransactionProcessingJob
{
    private readonly ITransactionService _transactionService;
    private readonly ILogger<TransactionProcessingJob> _logger;
    
    public TransactionProcessingJob(
        ITransactionService transactionService,
        ILogger<TransactionProcessingJob> logger)
    {
        _transactionService = transactionService;
        _logger = logger;
    }
    
    [AutomaticRetry(Attempts = 3)]
    public async Task ProcessPendingTransactionsAsync()
    {
        _logger.LogInformation("Starting transaction processing job");
        
        try
        {
            // Job logic here
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in transaction processing job");
            throw;
        }
    }
}
```

