import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpsWorkspacePage } from '../OpsWorkspacePage';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';

expect.extend(matchers);

// Mock recharts to avoid rendering complex SVGs in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: () => <div>AreaChart</div>,
  Area: () => <div>Area</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  Tooltip: () => <div>Tooltip</div>,
  CartesianGrid: () => <div>CartesianGrid</div>
}));

const mockZones = [
  { zoneId: 'z1', name: 'North Stand', density: 85, capacity: 1000, currentCount: 850, status: 'HIGH', updatedAt: '' }
];

describe('OpsWorkspacePage', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn((url) => {
      if (url === '/api/incidents') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      if (url === '/api/crowd') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockZones)
        });
      }
      return Promise.reject(new Error('Unknown url'));
    }) as any;
  });

  it('renders the triage queue and dashboard', async () => {
    await act(async () => {
      render(<OpsWorkspacePage />);
    });
    
    expect(screen.getByText(/Incident Triage Queue/i)).toBeInTheDocument();
    expect(screen.getByText(/Crowd Density Trend/i)).toBeInTheDocument();
  });

  it('passes accessibility tests', async () => {
    let container: any;
    await act(async () => {
      const result = render(<OpsWorkspacePage />);
      container = result.container;
    });
    const results = await axe(container);
    // @ts-ignore - vitest-axe types don't automatically augment Vitest's expect in all setups
    expect(results).toHaveNoViolations();
  });
});
