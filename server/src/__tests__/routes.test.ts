import request from 'supertest';
import express from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiRoutes from '../routes';

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

// Mock the db dependency
vi.mock('../db', () => ({
  getIncidents: vi.fn().mockResolvedValue([
    { incidentId: '1', zoneId: 'z1', priority: 'HIGH', status: 'active', summary: 'Mock Incident' }
  ]),
  getCrowdDensities: vi.fn().mockResolvedValue([
    { zoneId: 'z1', name: 'North Stand', density: 85, capacity: 1000, currentCount: 850, status: 'HIGH' }
  ]),
  getVenueLayout: vi.fn().mockResolvedValue({
    stadiumName: 'Mock Stadium',
    gates: [{ gateId: 'g1', name: 'Main Gate', isADACompliant: true }]
  }),
  logIncident: vi.fn().mockResolvedValue({ insertedId: '123' })
}));

describe('API Routes', () => {
  it('GET /api/incidents returns mock incidents', async () => {
    const res = await request(app).get('/api/incidents');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].priority).toBe('HIGH');
  });

  it('GET /api/crowd returns mock crowd zones', async () => {
    const res = await request(app).get('/api/crowd');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].density).toBe(85);
  });

  it('GET /api/venue returns venue layout', async () => {
    const res = await request(app).get('/api/venue');
    expect(res.status).toBe(200);
    expect(res.body.gates).toHaveLength(1);
    expect(res.body.gates[0].isADACompliant).toBe(true);
  });
});
