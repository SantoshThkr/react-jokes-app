import type { FormEvent } from 'react';
import { useState } from 'react';
import { getErrorMessage } from '../../api/client';
import { createOrder } from '../../api/ordersApi';
import type { Order } from '../../types/orders';

interface CreateOrderFormProps {
  onCreated: (order: Order) => void;
}

export function CreateOrderForm({ onCreated }: CreateOrderFormProps) {
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!customerName.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a number greater than 0.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const order = await createOrder({ customerName: customerName.trim(), amount: parsedAmount });
      setCustomerName('');
      setAmount('');
      onCreated(order);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create order'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel inline-form" onSubmit={handleSubmit} noValidate aria-labelledby="create-order-heading">
      <h2 id="create-order-heading">New order</h2>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="inline-form__fields">
        <div className="form-field">
          <label htmlFor="order-customer">Customer</label>
          <input
            id="order-customer"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            maxLength={120}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="order-amount">Amount (USD)</label>
          <input
            id="order-amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="button button--primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create order'}
        </button>
      </div>
    </form>
  );
}
