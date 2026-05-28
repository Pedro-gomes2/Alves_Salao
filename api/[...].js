export default async (req, res) => {
  res.status(200).json({
    message: 'Catch-all API working',
    path: req.url,
    method: req.method,
    pathname: req.query
  });
};
