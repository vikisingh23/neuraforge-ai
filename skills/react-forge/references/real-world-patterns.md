# Real-World Patterns — templates

Loaded on demand by the `react-forge` agent. Moved out of `agents/react-forge.md` so the agent prompt stays small.

## Template 1

Based on your web applications

```javascript
export const useTransactionFlow = () => {
  const [transactionType, setTransactionType] = useState(type);
  const [transactionData, setTransactionData] = useState(DEFAULT_DATA);
  
  const handleSubmit = async () => {
    // Complex business logic
  };
  
  return { transactionType, transactionData, handleSubmit };
};
```
