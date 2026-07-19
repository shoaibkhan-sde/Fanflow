import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StadiumMap } from '../StadiumMap';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';

expect.extend(matchers);

describe('StadiumMap', () => {
  const mockProps = {
    zones: [{ zoneId: 'z1', name: 'North Stand', capacity: 1000, currentCount: 500, density: 50, status: 'MEDIUM' as const, updatedAt: '' }],
    gates: [{ gateId: 'g1', name: 'Gate 1', nearZone: 'z1', isADACompliant: true, notes: '' }],
    transitHubs: [{ hubId: 't1', name: 'Metro', type: 'Train', nearGate: 'g1', isEcoFriendly: true }],
    highlights: [],
    activeIncidentZones: []
  };

  it('renders correctly', () => {
    render(<StadiumMap {...mockProps} />);
    expect(screen.getByText('STADIUM VISUALIZER')).toBeInTheDocument();
  });

  it('passes accessibility tests', async () => {
    const { container } = render(<StadiumMap {...mockProps} />);
    const results = await axe(container);
    // @ts-ignore - vitest-axe types don't automatically augment Vitest's expect in all setups
    expect(results).toHaveNoViolations();
  });
});
