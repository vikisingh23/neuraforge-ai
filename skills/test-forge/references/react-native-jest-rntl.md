# React Native (Jest + RNTL) — templates

Loaded on demand by the `test-forge` agent. Moved out of `agents/test-forge.md` so the agent prompt stays small.

## Template 1

```typescript
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

describe('TransactionListScreen', () => {
  it('shows loading indicator', () => {
    render(wrapWithProviders(<TransactionListScreen />));
    expect(screen.getByTestId('skeleton-loader')).toBeTruthy();
  });

  it('renders list after fetch', async () => {
    mockRepo.getTransactions.mockResolvedValue(mockTransactions);
    render(wrapWithProviders(<TransactionListScreen />));
    await waitFor(() => expect(screen.getByText('Example Flexi Cap')).toBeTruthy());
  });

  it('shows empty state', async () => {
    mockRepo.getTransactions.mockResolvedValue([]);
    render(wrapWithProviders(<TransactionListScreen />));
    await waitFor(() => expect(screen.getByText(/no transactions yet/i)).toBeTruthy());
  });

  it('pull-to-refresh triggers refetch', async () => {
    render(wrapWithProviders(<TransactionListScreen />));
    const list = screen.getByTestId('transaction-list');
    fireEvent(list, 'refresh');
    expect(mockRepo.getTransactions).toHaveBeenCalledTimes(2);
  });

  it('has proper accessibility labels', async () => {
    render(wrapWithProviders(<TransactionListScreen />));
    await waitFor(() => expect(screen.getByLabelText(/transaction list/i)).toBeTruthy());
  });
});
```
