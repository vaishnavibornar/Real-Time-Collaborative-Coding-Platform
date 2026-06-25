const express = require('express');
const router = express.Router();
const fileService = require('../services/fileService');
const authMiddleware = require('../middleware/authMiddleware');
const RoomMember = require('../models/RoomMember');
const File = require('../models/File');
const { roomMembers, files: filesInMemory } = require('../services/memoryStore');

// Helper to check if user has write access to the room
const checkWriteAccess = async (roomId, userId) => {
  if (global.useInMemoryDb) {
    const member = roomMembers.find(m => m.roomId === roomId && m.userId === userId);
    return member && ['OWNER', 'EDITOR'].includes(member.role);
  } else {
    const member = await RoomMember.findOne({ roomId, userId });
    return member && ['OWNER', 'EDITOR'].includes(member.role);
  }
};

// Create a new file
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { roomId, fileName, language, content } = req.body;
    const userId = req.user.userId;

    if (!roomId || !fileName) {
      return res.status(400).json({ error: 'RoomId and FileName are required' });
    }

    // Check write authorization
    const hasAccess = await checkWriteAccess(roomId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Unauthorized: Only Editors or Owners can create files' });
    }

    const file = await fileService.createFile(roomId, fileName, language, content);
    res.status(201).json(file);
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a file or mark it as active in the room
router.patch('/:fileId', authMiddleware, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { fileName, language, isActive, roomId } = req.body;
    const userId = req.user.userId;

    // To verify access, we need to know which room this file belongs to.
    let targetRoomId = roomId;

    if (!targetRoomId) {
      if (global.useInMemoryDb) {
        const file = filesInMemory.get(fileId);
        targetRoomId = file ? file.roomId : null;
      } else {
        const file = await File.findOne({ fileId });
        targetRoomId = file ? file.roomId : null;
      }
    }

    if (!targetRoomId) {
      return res.status(404).json({ error: 'File or Room not found' });
    }

    // Check write authorization
    const hasAccess = await checkWriteAccess(targetRoomId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Unauthorized: Only Editors or Owners can update files' });
    }

    let updatedFile = null;
    let updatedRoom = null;

    if (fileName || language) {
      updatedFile = await fileService.updateFile(fileId, { fileName, language });
    }

    if (isActive) {
      updatedRoom = await fileService.updateRoomActiveFile(targetRoomId, fileId);
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
router.delete('/:fileId', authMiddleware, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.userId;

    let targetRoomId = null;
    if (global.useInMemoryDb) {
      const file = filesInMemory.get(fileId);
      targetRoomId = file ? file.roomId : null;
    } else {
      const file = await File.findOne({ fileId });
      targetRoomId = file ? file.roomId : null;
    }

    if (!targetRoomId) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check write authorization
    const hasAccess = await checkWriteAccess(targetRoomId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Unauthorized: Only Editors or Owners can delete files' });
    }

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
