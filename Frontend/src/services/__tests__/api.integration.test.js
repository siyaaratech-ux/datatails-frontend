/**
 * API integration test: backend health check.
 * Uses REACT_APP_API_URL (default http://localhost:5000). Run with backend up for full verification:
 *   Backend: cd datatails-backend && python app.py
 *   Frontend: cd Frontend && npm test -- --testPathPattern=api.integration
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

describe('API health integration', () => {
  const timeout = 10000;

  test(
    'GET / returns API status',
    async () => {
      const res = await fetch(API_BASE + '/');
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty('status', 'API is running');
    },
    timeout
  );
});
