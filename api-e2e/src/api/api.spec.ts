import axios from 'axios';

// S-01 app-skeleton contract (needs the compose MySQL to be up so the
// health check can reach a real DB).
describe('GET /api/health', () => {
  it('reports ok/up against a live DB', async () => {
    const res = await axios.get('/api/health');

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ status: 'ok', db: 'up' });
  });
});

describe('unknown API route', () => {
  it('stays a JSON 404, never the SPA page', async () => {
    const res = await axios.get('/api/does-not-exist', {
      validateStatus: () => true,
    });

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.data).toMatchObject({ statusCode: 404 });
  });
});
