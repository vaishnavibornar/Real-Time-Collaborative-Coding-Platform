const Room = require('../models/Room');
const File = require('../models/File');
const crypto = require('crypto');

// In-memory data store for fallback mode
const { rooms: roomsInMemory, files: filesInMemory } = require('./memoryStore');

// In-memory cache for pending debounced file saves: fileId -> { timeout, saveFn, content }
const pendingSaves = new Map();

/**
 * Gets or creates a Room.
 * If the room is new, creates a default file (main.js) and sets it as the active file.
 */
async function getOrCreateRoom(roomId) {
  if (global.useInMemoryDb) {
    let room = roomsInMemory.get(roomId);
    if (!room) {
      room = {
        roomId,
        selectedLanguage: 'javascript',
        activeFileId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      roomsInMemory.set(roomId, room);

      // Create a default file
      const defaultFile = await createFile(roomId, 'main.js', 'javascript', '// Welcome to your collaborative workspace (In-Memory)!\n// Start coding here...\n');
      room.activeFileId = defaultFile.fileId;
    }
    return room;
  }

  let room = await Room.findOne({ roomId });
  if (!room) {
    room = new Room({
      roomId,
      selectedLanguage: 'javascript',
      activeFileId: null
    });
    await room.save();
    
    // Create a default file
    const defaultFile = await createFile(roomId, 'main.js', 'javascript', '// Welcome to your collaborative workspace!\n// Start coding here...\n');
    room.activeFileId = defaultFile.fileId;
    await room.save();
  }
  return room;
}

/**
 * Gets all files in a room.
 */
async function getFilesByRoom(roomId) {
  if (global.useInMemoryDb) {
    return Array.from(filesInMemory.values())
      .filter((f) => f.roomId === roomId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  return await File.find({ roomId }).sort({ createdAt: 1 });
}

/**
 * Creates a file in a room.
 */
async function createFile(roomId, fileName, language = 'javascript', content = '') {
  const fileId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);

  if (global.useInMemoryDb) {
    const file = {
      fileId,
      roomId,
      fileName,
      fileContent: content,
      language,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    filesInMemory.set(fileId, file);

    const room = roomsInMemory.get(roomId);
    if (room && !room.activeFileId) {
      room.activeFileId = fileId;
    }

    return file;
  }

  const file = new File({
    fileId,
    roomId,
    fileName,
    fileContent: content,
    language
  });
  await file.save();

  // If the room doesn't have an active file, set this one
  const room = await Room.findOne({ roomId });
  if (room && !room.activeFileId) {
    room.activeFileId = fileId;
    await room.save();
  }

  return file;
}

/**
 * Updates file metadata (fileName, language).
 */
async function updateFile(fileId, updates) {
  if (global.useInMemoryDb) {
    const file = filesInMemory.get(fileId);
    if (file) {
      Object.assign(file, updates, { updatedAt: new Date() });
    }
    return file;
  }

  const file = await File.findOneAndUpdate(
    { fileId },
    { $set: updates },
    { new: true }
  );
  return file;
}

/**
 * Deletes a file and updates room's active file if needed.
 */
async function deleteFile(fileId) {
  if (global.useInMemoryDb) {
    const file = filesInMemory.get(fileId);
    if (!file) return null;

    const roomId = file.roomId;
    filesInMemory.delete(fileId);

    // Remove from pending saves if present
    if (pendingSaves.has(fileId)) {
      const pending = pendingSaves.get(fileId);
      clearTimeout(pending.timeout);
      pendingSaves.delete(fileId);
    }

    const room = roomsInMemory.get(roomId);
    if (room && room.activeFileId === fileId) {
      const remainingFiles = Array.from(filesInMemory.values())
        .filter((f) => f.roomId === roomId)
        .sort((a, b) => a.createdAt - b.createdAt);

      if (remainingFiles.length > 0) {
        room.activeFileId = remainingFiles[0].fileId;
        room.selectedLanguage = remainingFiles[0].language;
      } else {
        room.activeFileId = null;
      }
    }

    return { roomId, fileId, newActiveFileId: room ? room.activeFileId : null };
  }

  const file = await File.findOne({ fileId });
  if (!file) return null;

  const roomId = file.roomId;
  await File.deleteOne({ fileId });

  // Remove from pending saves if present
  if (pendingSaves.has(fileId)) {
    const pending = pendingSaves.get(fileId);
    clearTimeout(pending.timeout);
    pendingSaves.delete(fileId);
  }

  // Update room activeFileId if the deleted file was active
  const room = await Room.findOne({ roomId });
  if (room && room.activeFileId === fileId) {
    const remainingFiles = await File.find({ roomId }).sort({ createdAt: 1 });
    if (remainingFiles.length > 0) {
      room.activeFileId = remainingFiles[0].fileId;
      room.selectedLanguage = remainingFiles[0].language;
    } else {
      room.activeFileId = null;
    }
    await room.save();
  }

  return { roomId, fileId, newActiveFileId: room ? room.activeFileId : null };
}

/**
 * Updates the active file ID of a room.
 */
async function updateRoomActiveFile(roomId, activeFileId) {
  if (global.useInMemoryDb) {
    const file = filesInMemory.get(activeFileId);
    const selectedLanguage = file ? file.language : 'javascript';
    const room = roomsInMemory.get(roomId);
    if (room) {
      room.activeFileId = activeFileId;
      room.selectedLanguage = selectedLanguage;
      room.updatedAt = new Date();
    }
    return room;
  }

  const file = await File.findOne({ fileId: activeFileId });
  const selectedLanguage = file ? file.language : 'javascript';
  
  return await Room.findOneAndUpdate(
    { roomId },
    { $set: { activeFileId, selectedLanguage } },
    { new: true }
  );
}

/**
 * Queues a debounced write to the database for a file's content.
 */
function queueFileSave(fileId, content) {
  if (global.useInMemoryDb) {
    const file = filesInMemory.get(fileId);
    if (file) {
      file.fileContent = content;
      file.updatedAt = new Date();
    }
    return;
  }

  const pending = pendingSaves.get(fileId);
  
  if (pending) {
    clearTimeout(pending.timeout);
  }

  const saveFn = async () => {
    try {
      await File.updateOne({ fileId }, { fileContent: content });
      pendingSaves.delete(fileId);
      console.log(`[Database] Auto-saved file: ${fileId}`);
    } catch (err) {
      console.error(`[Database] Error auto-saving file ${fileId}:`, err);
    }
  };

  // Debounce saving: wait 2 seconds of inactivity.
  const timeout = setTimeout(saveFn, 2000);
  pendingSaves.set(fileId, {
    timeout,
    saveFn,
    content
  });
}

/**
 * Flushes (force saves) a specific file if it has a pending write.
 */
async function flushFileSave(fileId) {
  if (global.useInMemoryDb) return;

  const pending = pendingSaves.get(fileId);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingSaves.delete(fileId);
    try {
      await File.updateOne({ fileId }, { fileContent: pending.content });
      console.log(`[Database] Flushed file save: ${fileId}`);
    } catch (err) {
      console.error(`[Database] Error flushing file save ${fileId}:`, err);
    }
  }
}

/**
 * Flushes all pending saves for files belonging to a specific room.
 */
async function flushRoomSaves(roomId) {
  if (global.useInMemoryDb) return;

  const files = await File.find({ roomId });
  const fileIds = files.map(f => f.fileId);
  
  const savePromises = [];
  for (const fileId of fileIds) {
    if (pendingSaves.has(fileId)) {
      savePromises.push(flushFileSave(fileId));
    }
  }
  if (savePromises.length > 0) {
    await Promise.all(savePromises);
    console.log(`[Database] Flushed all pending saves for room: ${roomId}`);
  }
}

module.exports = {
  getOrCreateRoom,
  getFilesByRoom,
  createFile,
  updateFile,
  deleteFile,
  updateRoomActiveFile,
  queueFileSave,
  flushFileSave,
  flushRoomSaves,
  pendingSaves
};
