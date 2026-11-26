# React (Vitest + React Testing Library) — templates

Loaded on demand by the `test-forge` agent. Moved out of `agents/test-forge.md` so the agent prompt stays small.

## Template 1

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const wrapper = ({ children }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('TransactionList', () => {
  it('shows loading skeleton initially', () => {
    render(<TransactionList />, { wrapper });
    expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
  });

  it('renders transactions after fetch', async () => {
    server.use(http.get('/api/transactions', () => HttpResponse.json(mockTransactions)));
    render(<TransactionList />, { wrapper });
    await waitFor(() => expect(screen.getByText('Example Flexi Cap')).toBeInTheDocument());
  });

  it('shows empty state when no data', async () => {
    server.use(http.get('/api/transactions', () => HttpResponse.json([])));
    render(<TransactionList />, { wrapper });
    await waitFor(() => expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument());
  });

  it('shows error with retry button on failure', async () => {
    server.use(http.get('/api/transactions', () => HttpResponse.error()));
    render(<TransactionList />, { wrapper });
    await waitFor(() => expect(screen.getByText(/unable to load/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('formats amounts in Indian format with ₹', async () => {
    server.use(http.get('/api/transactions', () => HttpResponse.json([{ amount: 123456.78 }])));
    render(<TransactionList />, { wrapper });
    await waitFor(() => expect(screen.getByText('₹1,23,456.78')).toBeInTheDocument());
  });
});

describe('TransactionForm', () => {
  it('shows validation error on blur for invalid amount', async () => {
    render(<TransactionForm />, { wrapper });
    const amountInput = screen.getByLabelText(/amount/i);
    await userEvent.type(amountInput, '100');
    await userEvent.tab();
    expect(screen.getByText(/minimum.*₹500/i)).toBeInTheDocument();
  });

  it('disables submit button during API call', async () => {
    render(<TransactionForm />, { wrapper });
    // fill valid form...
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
  });

  it('shows confirmation dialog for irreversible actions', async () => {
    render(<RedeemForm />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /redeem/i }));
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
  });
});
```
