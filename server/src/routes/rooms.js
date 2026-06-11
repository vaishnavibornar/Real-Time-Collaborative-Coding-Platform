const express = require('express');
const router = express.Router();
const fileService = require('../services/fileService');

// Get room details (create if it doesn't exist) along with all files
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await fileService.getOrCreateRoom(roomId);
    const files = await fileService.getFilesByRoom(roomId);
    
    res.json({
      room,
      files
    });
  } catch (error) {
    console.error('Error fetching/creating room:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
