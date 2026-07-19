import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AlertStrip } from '../AlertStrip';
import type { Incident } from '../../types';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';

expect.extend(matchers);

const mockIncidents: Incident[] = [
  {
    incidentId: '1',
    zoneId: 'North Stand',
    category: 'crowd',
    priority: 'HIGH',
    status: 'active',
    summary: 'High Crowd Density',
    description: 'Crowd density > 80%',
    reportedBy: 'system',
    createdAt: new Date().toISOString()
  }
];

describe('AlertStrip', () => {
  it('renders correctly with incidents', () => {
    render(<AlertStrip incidents={mockIncidents} />);
    expect(screen.getByText(/High Crowd Density/)).toBeInTheDocument();
    expect(screen.getByText(/North Stand/)).toBeInTheDocument();
  });

  it('renders no active incidents state', () => {
    render(<AlertStrip incidents={[]} />);
    expect(screen.getByText(/All zones operating normally/i)).toBeInTheDocument();
  });

  it('calls onIncidentClick when an incident is clicked', () => {
    const handleClick = vi.fn();
    render(<AlertStrip incidents={mockIncidents} onIncidentClick={handleClick} />);
    
    fireEvent.click(screen.getByText('High Crowd Density'));
    expect(handleClick).toHaveBeenCalledWith(mockIncidents[0]);
  });

  it('passes accessibility tests', async () => {
    const { container } = render(<AlertStrip incidents={mockIncidents} />);
    const results = await axe(container);
    // @ts-ignore - vitest-axe types don't automatically augment Vitest's expect in all setups
    expect(results).toHaveNoViolations();
  });
});
