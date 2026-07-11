import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarChart, DonutChart, LineChart } from './analytics-charts';

const data = [
  { key: 'open', label: 'Open', value: 4 },
  { key: 'done', label: 'Done', value: 2 },
];

describe('analytics chart components', () => {
  it('renders bar, line, and donut charts with accessible labels', () => {
    render(
      <div>
        <BarChart data={data} />
        <LineChart data={data} />
        <DonutChart data={data} />
      </div>,
    );

    expect(screen.getByRole('img', { name: /bar chart/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /line chart/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /donut chart/i })).toBeInTheDocument();
    expect(screen.getAllByText('Open').length).toBeGreaterThan(0);
  });

  it('shows an empty state when no chart data exists', () => {
    render(<BarChart data={[]} />);

    expect(screen.getByText(/no data yet/i)).toBeInTheDocument();
  });
});
