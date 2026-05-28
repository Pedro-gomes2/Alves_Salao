import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cachedApp: express.Express | null = null;

async function getApp(): Promise<express.Express> {
  if (cachedApp) return cachedApp;

  try {
    // Import the compiled server
    const { default: createApp } = await import('../dist/server.cjs');

    if (typeof createApp === 'function') {
      cachedApp = await createApp();
    } else {
      cachedApp = createApp;
    }

    return cachedApp;
  } catch (error) {
    console.error('Failed to load app:', error);
    throw error;
  }
}

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
