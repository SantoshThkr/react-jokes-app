import { memo } from 'react';
import type { DashboardSummary } from '../../types/dashboard';
import { formatCurrency, formatNumber } from '../../utils/format';

interface SummaryCardsProps {
  summary: DashboardSummary;
}

export const SummaryCards = memo(function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    { label: 'Active users', value: formatNumber(summary.activeUsers), hint: 'Connected now' },
    { label: 'Orders today', value: formatNumber(summary.ordersToday), hint: 'Created today (UTC)' },
    { label: 'Revenue', value: formatCurrency(summary.revenueToday), hint: 'Completed today (UTC)' },
    { label: 'Errors', value: formatNumber(summary.errorsToday), hint: 'System warnings today' },
  ];

  return (
    <section aria-labelledby="summary-heading">
      <h2 id="summary-heading" className="visually-hidden">
        Summary
      </h2>
      <dl className="summary-cards">
        {cards.map((card) => (
          <div key={card.label} className="summary-card">
            <dt className="summary-card__label">{card.label}</dt>
            <dd className="summary-card__value">{card.value}</dd>
            <dd className="summary-card__hint">{card.hint}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
});
