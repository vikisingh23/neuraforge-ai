# Forge Payment Gateway Patterns

Loaded on demand by the `forge` agent when a task involves a payment gateway.

### Razorpay Integration

**Configuration (appsettings.json)**
```json
{
  "Razorpay": {
    "KeyId": "rzp_test_xxxxx",
    "KeySecret": "xxxxx",
    "WebhookSecret": "whsec_xxxxx",
    "BaseUrl": "https://api.razorpay.com/v1/"
  }
}
```

**Service Pattern**
```csharp
public class RazorpayService : IRazorpayService
{
    private readonly string _key;
    private readonly string _secret;
    private readonly string _webhookSecret;
    private readonly HttpClient _httpClient;
    private readonly ILogger<RazorpayService> _logger;
    
    public RazorpayService(
        HttpClient httpClient, 
        ILogger<RazorpayService> logger,
        IOptions<RazorpayOptions> options)
    {
        _key = options.Value.KeyId;
        _secret = options.Value.KeySecret;
        _webhookSecret = options.Value.WebhookSecret;
        _httpClient = httpClient;
        _logger = logger;
        
        // Set base URL and auth headers
        _httpClient.BaseAddress = new Uri(options.Value.BaseUrl);
        var authToken = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{_key}:{_secret}"));
        _httpClient.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Basic", authToken);
    }
    
    // Verify Webhook Signature (CRITICAL)
    public bool VerifyWebhookSignature(string payload, string signature)
    {
        if (string.IsNullOrEmpty(payload) || string.IsNullOrEmpty(signature))
            return false;
            
        try
        {
            // Razorpay signature format: "sha256=<hash>"
            if (!signature.StartsWith("sha256="))
                return false;
                
            var expectedSignature = signature.Substring(7);
            
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_webhookSecret));
            var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var computedSignature = Convert.ToHexString(computedHash).ToLower();
            
            // Secure comparison
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expectedSignature),
                Encoding.UTF8.GetBytes(computedSignature));
        }
        catch
        {
            return false;
        }
    }
}
```

### Billdesk Integration (JWE/JWS)

**Configuration**
```json
{
  "Billdesk": {
    "MerchantId": "BDXXXXXX",
    "ClientId": "client_xxxxx",
    "EncryptionKey": "xxxxx",
    "EncryptionKeyId": "xxxxx",
    "SigningKey": "xxxxx",
    "SigningKeyId": "xxxxx",
    "BaseUrl": "https://uat1.billdesk.com/u2/"
  }
}
```

**Service with JWE/JWS**
```csharp
public class BilldeskService : IBilldeskService
{
    // Create JWE Encrypted Payload
    private string CreateJWEEncryptedPayload(object payload)
    {
        var jsonPayload = JsonSerializer.Serialize(payload);
        var jweHeaders = new Dictionary<string, object>
        {
            { "kid", _encryptionKeyId },
            { "clientid", _clientId }
        };
        
        var keyBytes = Encoding.UTF8.GetBytes(_encryptionKey);
        return JWT.Encode(jsonPayload, keyBytes, JweAlgorithm.DIR, 
            JweEncryption.A256GCM, extraHeaders: jweHeaders);
    }
    
    // Create JWS Signed Payload
    private string CreateJWSSignedPayload(string encryptedPayload)
    {
        var jwsHeaders = new Dictionary<string, object>
        {
            { "alg", "HS256" },
            { "kid", _signingKeyId },
            { "clientid", _clientId }
        };
        
        var signingKeyBytes = Encoding.UTF8.GetBytes(_signingKey);
        return JWT.Encode(encryptedPayload, signingKeyBytes, 
            JwsAlgorithm.HS256, extraHeaders: jwsHeaders);
    }
}
```

**Payment Gateway Factory**
```csharp
public class PaymentGatewayFactory : IPaymentGatewayFactory
{
    public IPaymentGatewayService GetPaymentGateway(string gatewayName)
    {
        return gatewayName.ToUpper() switch
        {
            "RAZORPAY" => _razorpayService,
            "BILLDESK" => _billdeskService,
            _ => throw new NotSupportedException($"Gateway {gatewayName} not supported")
        };
    }
}
```

