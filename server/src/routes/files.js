const express = require('express');
const router = express.Router();
const fileService = require('../services/fileService');

// Create a new file
router.post('/', async (req, res) => {
  try {
    const { roomId, fileName, language, content } = req.body;
    if (!roomId || !fileName) {
      return res.status(400).json({ error: 'RoomId and FileName are required' });
    }
    const file = await fileService.createFile(roomId, fileName, language, content);
    res.status(201).json(file);
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a file or mark it as active in the room
router.patch('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { fileName, language, isActive, roomId } = req.body;
    
    let updatedFile = null;
    let updatedRoom = null;

    if (fileName || language) {
      updatedFile = await fileService.updateFile(fileId, { fileName, language });
    }

    if (isActive && roomId) {
      updatedRoom = await fileService.updateRoomActiveFile(roomId, fileId);
    }

    res.json({
      file: updatedFile,
      room: updatedRoom
    });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a file
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const result = await fileService.deleteFile(fileId);
    if (!result) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(result);
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
