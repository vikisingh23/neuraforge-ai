# Mode 1 Workflow: TDD Test Generation — templates

Loaded on demand by the `test-forge` agent. Moved out of `agents/test-forge.md` so the agent prompt stays small.

## Template 1

For .NET (xUnit)

```csharp
public class CreateSipServiceTests
{
    // FROM BRS: "SIP minimum amount is ₹500"
    [Theory]
    [InlineData(400)]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task CreateSip_BelowMinimum_ReturnsValidationError(decimal amount)
    {
        var request = new CreateSipRequest { Amount = amount };
        var result = await _service.CreateSipAsync(request);
        Assert.True(result.IsFailure);
        Assert.Contains("minimum", result.Error.Message, StringComparison.OrdinalIgnoreCase);
    }

    // FROM BRS: "Mandate is required for SIP"
    [Fact]
    public async Task CreateSip_NoMandate_ReturnsError()
    {
        var request = new CreateSipRequest { Amount = 5000, MandateId = null };
        var result = await _service.CreateSipAsync(request);
        Assert.True(result.IsFailure);
        Assert.Contains("mandate", result.Error.Message, StringComparison.OrdinalIgnoreCase);
    }

    // FROM BRS: "Valid SIP creates subscription with REGISTERED status"
    [Fact]
    public async Task CreateSip_ValidRequest_ReturnsRegistered()
    {
        var request = new CreateSipRequest
        {
            Amount = 5000,
            Frequency = "Monthly",
            MandateId = "M123",
            SchemeCode = "MOSL-MID-DG"
        };
        var result = await _service.CreateSipAsync(request);
        Assert.True(result.IsSuccess);
        Assert.Equal("REGISTERED", result.Value.Status);
    }
}
```
