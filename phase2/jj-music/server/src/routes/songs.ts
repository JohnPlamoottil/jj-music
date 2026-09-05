
// Serve artwork image
router.get('/artwork/:filename', (req, res, next) => {
  try {
    const filename = req.params.filename;
    // Prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const filePath = path.join(config.LOCAL_UPLOAD_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Artwork not found' });
    }
    res.sendFile(filePath);
  } catch (err: any) {
    next(err);
  }
});

export default router;
