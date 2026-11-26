# 🎯 API Generation Workflow (MANDATORY) — templates

Loaded on demand by the `spring-forge` agent. Moved out of `agents/spring-forge.md` so the agent prompt stays small.

## Template 1

```java
@Entity
@Table(name = "om_transaction")
@EntityListeners(AuditingEntityListener.class)
@SQLDelete(sql = "UPDATE om_transaction SET is_deleted = true WHERE id = ?1")
@Where(clause = "is_deleted = false")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String schemeName;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TransactionStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "investor_id", nullable = false)
    private Investor investor;

    // MANDATORY audit fields
    @CreatedBy
    @Column(updatable = false)
    private String createdBy;

    @LastModifiedBy
    private String modifiedBy;

    @CreatedDate
    @Column(updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    private Instant modifiedAt;

    @Column(nullable = false)
    private boolean isDeleted = false;

    @Column(nullable = false, unique = true, length = 100)
    private String idempotencyKey; // client-supplied, enforced unique at the DB level too

    @Version
    private Long version; // Optimistic locking
}
```

## Template 2

```java
@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    Page<Transaction> findByInvestorIdAndIsDeletedFalse(
        UUID investorId, Pageable pageable);

    Optional<Transaction> findByIdAndIsDeletedFalse(UUID id);

    @Query("SELECT t FROM Transaction t WHERE t.investor.id = :investorId " +
           "AND t.status = :status AND t.isDeleted = false")
    List<Transaction> findByInvestorAndStatus(
        @Param("investorId") UUID investorId,
        @Param("status") TransactionStatus status);

    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);
}
```

## Template 3

```java
// CreateTransactionRequest.java
public record CreateTransactionRequest(
    @NotBlank(message = "Scheme name is required")
    @Size(max = 100)
    String schemeName,

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "500", message = "Minimum transaction amount is 500")
    BigDecimal amount,

    @NotNull
    UUID investorId,

    @NotBlank(message = "Idempotency-Key is required")
    String idempotencyKey
) {}

// TransactionResponse.java
public record TransactionResponse(
    UUID id, String schemeName, BigDecimal amount,
    TransactionStatus status, Instant createdAt, Instant modifiedAt
) {}

// TransactionMapper.java
@Mapper(componentModel = "spring")
public interface TransactionMapper {
    TransactionResponse toResponse(Transaction entity);
    List<TransactionResponse> toResponseList(List<Transaction> entities);
}
```

## Template 4

```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransactionService {

    private final TransactionRepository transactionRepo;
    private final TransactionMapper mapper;
    private final ApplicationEventPublisher eventPublisher;

    public Page<TransactionResponse> findAll(UUID investorId, Pageable pageable) {
        return transactionRepo.findByInvestorIdAndIsDeletedFalse(investorId, pageable)
            .map(mapper::toResponse);
    }

    public TransactionResponse findById(UUID id) {
        return transactionRepo.findByIdAndIsDeletedFalse(id)
            .map(mapper::toResponse)
            .orElseThrow(() -> new EntityNotFoundException("Transaction", id));
    }

    @Transactional
    public TransactionResponse create(CreateTransactionRequest request, String userId) {
        // Idempotency check FIRST — a retried POST (client timeout, network retry) must
        // return the original result, never create a second transaction.
        var existing = transactionRepo.findByIdempotencyKey(request.idempotencyKey());
        if (existing.isPresent()) {
            return mapper.toResponse(existing.get());
        }

        var transaction = Transaction.builder()
            .schemeName(request.schemeName())
            .amount(request.amount())
            .investorId(request.investorId())
            .idempotencyKey(request.idempotencyKey())
            .status(TransactionStatus.PENDING)
            .build();

        try {
            transaction = transactionRepo.save(transaction);
        } catch (DataIntegrityViolationException e) {
            // Unique constraint on idempotencyKey caught a race (two concurrent retries) —
            // fetch and return the winner instead of surfacing a 500.
            return transactionRepo.findByIdempotencyKey(request.idempotencyKey())
                .map(mapper::toResponse)
                .orElseThrow(() -> e);
        }

        eventPublisher.publishEvent(new TransactionCreatedEvent(transaction.getId()));
        return mapper.toResponse(transaction);
    }

    @Transactional
    public void softDelete(UUID id, String userId) {
        var transaction = transactionRepo.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new EntityNotFoundException("Transaction", id));
        transaction.setDeleted(true);
        transactionRepo.save(transaction);
    }
}
```

## Template 5

```java
@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
@Tag(name = "Transactions")
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    @Operation(summary = "List transactions by investor")
    public ResponseEntity<ApiResponse<Page<TransactionResponse>>> findAll(
            @RequestParam UUID investorId,
            @ParameterObject Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
            transactionService.findAll(investorId, pageable)));
    }

    @PostMapping
    @Operation(summary = "Create transaction")
    public ResponseEntity<ApiResponse<TransactionResponse>> create(
            @Valid @RequestBody CreateTransactionRequest request,
            @AuthenticationPrincipal UserPrincipal user) {
        var result = transactionService.create(request, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get transaction by ID")
    public ResponseEntity<ApiResponse<TransactionResponse>> findById(
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(
            transactionService.findById(id)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Soft delete transaction")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal user) {
        transactionService.softDelete(id, user.getId());
    }
}
```

## Template 6

```java
@Data
@Builder
public class ApiResponse<T> {
    private int statusCode;
    private String message;
    private T data;
    private Instant timestamp;

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
            .statusCode(200).message("Success")
            .data(data).timestamp(Instant.now()).build();
    }

    public static <T> ApiResponse<T> error(int code, String message) {
        return ApiResponse.<T>builder()
            .statusCode(code).message(message)
            .timestamp(Instant.now()).build();
    }
}
```

## Template 7

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(EntityNotFoundException ex) {
        return ResponseEntity.status(404).body(ApiResponse.error(404, ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidation(
            MethodArgumentNotValidException ex) {
        var errors = ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(FieldError::getField, FieldError::getDefaultMessage));
        return ResponseEntity.status(422).body(ApiResponse.<Map<String, String>>builder()
            .statusCode(422).message("Validation failed").data(errors)
            .timestamp(Instant.now()).build());
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ApiResponse<Void>> handleConcurrency(OptimisticLockingFailureException ex) {
        return ResponseEntity.status(409).body(ApiResponse.error(409, "Resource was modified by another request"));
    }
}
```

## Template 8

```java
@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock private TransactionRepository transactionRepo;
    @Mock private TransactionMapper mapper;
    @Mock private ApplicationEventPublisher eventPublisher;
    @InjectMocks private TransactionService service;

    @Test
    void findById_whenExists_returnsTransaction() {
        var entity = TestFactory.transaction();
        var response = TestFactory.transactionResponse();
        when(transactionRepo.findByIdAndIsDeletedFalse(entity.getId())).thenReturn(Optional.of(entity));
        when(mapper.toResponse(entity)).thenReturn(response);

        var result = service.findById(entity.getId());

        assertThat(result).isEqualTo(response);
    }

    @Test
    void findById_whenNotFound_throwsException() {
        var id = UUID.randomUUID();
        when(transactionRepo.findByIdAndIsDeletedFalse(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(id))
            .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void create_setsAuditFieldsAndPublishesEvent() {
        var request = new CreateTransactionRequest("Test Fund", BigDecimal.valueOf(5000), UUID.randomUUID(), "idem-key-1");
        when(transactionRepo.findByIdempotencyKey("idem-key-1")).thenReturn(Optional.empty());
        when(transactionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(mapper.toResponse(any())).thenReturn(TestFactory.transactionResponse());

        service.create(request, "user-1");

        verify(transactionRepo).save(any());
        verify(eventPublisher).publishEvent(any(TransactionCreatedEvent.class));
    }

    @Test
    void create_withKnownIdempotencyKey_returnsExistingWithoutCreatingDuplicate() {
        var request = new CreateTransactionRequest("Test Fund", BigDecimal.valueOf(5000), UUID.randomUUID(), "idem-key-1");
        var existing = TestFactory.transaction();
        when(transactionRepo.findByIdempotencyKey("idem-key-1")).thenReturn(Optional.of(existing));
        when(mapper.toResponse(existing)).thenReturn(TestFactory.transactionResponse());

        service.create(request, "user-1");

        verify(transactionRepo, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }
}
```
