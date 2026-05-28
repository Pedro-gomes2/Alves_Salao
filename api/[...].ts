import { VercelRequest, VercelResponse } from '@vercel/node';

// Test endpoint to verify serverless function works
export default async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    message: 'Serverless function working!',
    path: req.url,
    method: req.method
  });
};
