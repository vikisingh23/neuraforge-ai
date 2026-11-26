# .NET (xUnit + Moq + FluentAssertions) — templates

Loaded on demand by the `test-forge` agent. Moved out of `agents/test-forge.md` so the agent prompt stays small.

## Template 1

```csharp
public class TransactionServiceTests
{
    private readonly Mock<ITransactionRepository> _repoMock;
    private readonly Mock<ILogger<TransactionService>> _loggerMock;
    private readonly TransactionService _sut;

    public TransactionServiceTests()
    {
        _repoMock = new Mock<ITransactionRepository>();
        _loggerMock = new Mock<ILogger<TransactionService>>();
        _sut = new TransactionService(_repoMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task GetByIdAsync_WhenExists_ReturnsTransaction()
    {
        // Arrange
        var expected = new Transaction { Id = 1, Amount = 5000m };
        _repoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        // Act
        var result = await _sut.GetByIdAsync(1, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Data.Amount.Should().Be(5000m);
    }

    [Fact]
    public async Task GetByIdAsync_WhenNotFound_ReturnsFailure()
    {
        _repoMock.Setup(r => r.GetByIdAsync(999, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Transaction?)null);

        var result = await _sut.GetByIdAsync(999, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.ErrorMessage.Should().Contain("not found");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-100)]
    [InlineData(499.99)]
    public async Task CreateAsync_WithInvalidAmount_ReturnsValidationError(decimal amount)
    {
        var dto = new CreateTransactionDto { Amount = amount };

        var result = await _sut.CreateAsync(dto, "user-1", CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
    }
}
```

## Template 2

```csharp
public class TransactionControllerTests
{
    private readonly Mock<ITransactionService> _serviceMock;
    private readonly TransactionController _sut;

    [Fact]
    public async Task GetAll_ReturnsPaginatedResult()
    {
        _serviceMock.Setup(s => s.GetAllAsync(It.IsAny<PaginationParams>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(OperationResult<PaginatedResult<TransactionDto>>.Success(testData));

        var result = await _sut.GetAll(new PaginationParams(), CancellationToken.None);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.StatusCode.Should().Be(200);
    }
}
```
