const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
let clients = [];

export default async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const path = req.url.split('?')[0];

  // Simple API responses without complex imports
  if (path === '/api/db-status') {
    return res.json({ configured: false, mode: 'local_memory' });
  }

  if (path === '/api/services') {
    return res.json([]);
  }

  if (path === '/api/specialists') {
    return res.json([]);
  }

  if (path === '/api/bookings') {
    return res.json([]);
  }

  if (path === '/api/auth/login') {
    const { username, password } = req.body || {};
    if (username === 'admin' && password === 'alves2026') {
      const user = { id: 'admin-1', name: 'Admin', username: 'admin', roleType: 'admin' };
      const token = 'test-token-123';
      return res.json({ token, user });
    }
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  res.status(404).json({ error: 'Not Found' });
};
