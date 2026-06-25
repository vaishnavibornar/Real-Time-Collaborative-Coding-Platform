const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const authMiddleware = require('../middleware/authMiddleware');
const fileService = require('../services/fileService');
const Room = require('../models/Room');
const RoomMember = require('../models/RoomMember');
const User = require('../models/User');
const { rooms, roomMembers, users } = require('../services/memoryStore');

// 1. GET / - List all rooms the user has access to (OWNER/EDITOR/VIEWER) + all Public Rooms
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    let joinedRoomIds = [];
    let roomsList = [];

    if (global.useInMemoryDb) {
      // Find all rooms where user is a member
      joinedRoomIds = roomMembers
        .filter(m => m.userId === userId && m.role !== 'PENDING')
        .map(m => m.roomId);

      // Get rooms details
      roomsList = Array.from(rooms.values()).filter(
        r => r.visibility === 'public' || joinedRoomIds.includes(r.roomId)
      );
    } else {
      const memberships = await RoomMember.find({ userId, role: { $ne: 'PENDING' } });
      joinedRoomIds = memberships.map(m => m.roomId);

      roomsList = await Room.find({
        $or: [
          { visibility: 'public' },
          { roomId: { $in: joinedRoomIds } }
        ]
      }).lean();
    }

    res.json(roomsList);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. POST / - Create a new room (visibility public/private)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { roomName, visibility } = req.body;
    const userId = req.user.userId;

    if (!roomName) {
      return res.status(400).json({ error: 'RoomName is required' });
    }

    const roomId = crypto.randomBytes(6).toString('hex'); // custom short room slug

    let room = null;

    if (global.useInMemoryDb) {
      room = {
        roomId,
        roomName,
        ownerId: userId,
        visibility: visibility || 'public',
        selectedLanguage: 'javascript',
        activeFileId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      rooms.set(roomId, room);

      // Add as OWNER room member
      roomMembers.push({
        roomId,
        userId,
        role: 'OWNER',
        createdAt: new Date()
      });

      // Create default file
      const defaultFile = await fileService.createFile(roomId, 'main.js', 'javascript', '// Start coding here...\n');
      room.activeFileId = defaultFile.fileId;
    } else {
      room = new Room({
        roomId,
        roomName,
        ownerId: userId,
        visibility: visibility || 'public',
        selectedLanguage: 'javascript',
        activeFileId: null
      });
      await room.save();

      const member = new RoomMember({
        roomId,
        userId,
        role: 'OWNER'
      });
      await member.save();

      // Create default file
      const defaultFile = await fileService.createFile(roomId, 'main.js', 'javascript', '// Start coding here...\n');
      room.activeFileId = defaultFile.fileId;
      await room.save();
    }

    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. GET /:roomId - Fetch room details, files, and members
router.get('/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    let room = null;
    let userRole = null;
    let roomMembersList = [];

    // Fetch room
    if (global.useInMemoryDb) {
      room = rooms.get(roomId);
    } else {
      room = await Room.findOne({ roomId }).lean();
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check membership
    if (global.useInMemoryDb) {
      const membership = roomMembers.find(m => m.roomId === roomId && m.userId === userId);
      if (membership) {
        userRole = membership.role;
      }
    } else {
      const membership = await RoomMember.findOne({ roomId, userId }).lean();
      if (membership) {
        userRole = membership.role;
      }
    }

    // Access control validation
    const isOwner = room.ownerId.toString() === userId;
    
    if (room.visibility === 'private') {
      if (!userRole || userRole === 'PENDING') {
        return res.status(403).json({
          error: 'Access Denied',
          isPrivate: true,
          roomName: room.roomName,
          status: userRole || 'none'
        });
      }
    } else {
      // For public rooms, if they are logged in but not a member yet, add them as EDITOR
      if (!userRole) {
        userRole = 'EDITOR';
        if (global.useInMemoryDb) {
          roomMembers.push({
            roomId,
            userId,
            role: 'EDITOR',
            createdAt: new Date()
          });
        } else {
          const member = new RoomMember({
            roomId,
            userId,
            role: 'EDITOR'
          });
          await member.save();
        }
      }
    }

    // Fetch members and pending requests details
    if (global.useInMemoryDb) {
      const dbMembers = roomMembers.filter(m => m.roomId === roomId);
      roomMembersList = dbMembers.map(m => {
        const userObj = Array.from(users.values()).find(u => u.id === m.userId);
        return {
          userId: m.userId,
          name: userObj ? userObj.name : 'Unknown User',
          email: userObj ? userObj.email : '',
          role: m.role
        };
      });
    } else {
      const dbMembers = await RoomMember.find({ roomId }).populate('userId', 'name email').lean();
      roomMembersList = dbMembers.map(m => ({
        userId: m.userId?._id?.toString() || m.userId,
        name: m.userId?.name || 'Unknown User',
        email: m.userId?.email || '',
        role: m.role
      }));
    }

    // Fetch files
    const files = await fileService.getFilesByRoom(roomId);

    // Filter members list: separates approved members from pending requests
    const members = roomMembersList.filter(m => m.role !== 'PENDING');
    const pendingRequests = isOwner ? roomMembersList.filter(m => m.role === 'PENDING') : [];

    res.json({
      room,
      files,
      role: userRole,
      members,
      pendingRequests
    });
  } catch (error) {
    console.error('Error fetching room details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. POST /:roomId/requests/join - Request to join a private room
router.post('/:roomId/requests/join', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    let room = null;
    if (global.useInMemoryDb) {
      room = rooms.get(roomId);
    } else {
      room = await Room.findOne({ roomId });
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.visibility !== 'private') {
      return res.status(400).json({ error: 'Room is public, join request not required' });
    }

    // Check if membership already exists
    let existingMembership = null;
    if (global.useInMemoryDb) {
      existingMembership = roomMembers.find(m => m.roomId === roomId && m.userId === userId);
    } else {
      existingMembership = await RoomMember.findOne({ roomId, userId });
    }

    if (existingMembership) {
      if (existingMembership.role === 'PENDING') {
        return res.status(400).json({ error: 'Join request already pending' });
      }
      return res.status(400).json({ error: 'Already a member of this room' });
    }

    // Create a pending room member entry
    if (global.useInMemoryDb) {
      roomMembers.push({
        roomId,
        userId,
        role: 'PENDING',
        createdAt: new Date()
      });
    } else {
      const member = new RoomMember({
        roomId,
        userId,
        role: 'PENDING'
      });
      await member.save();
    }

    res.json({ message: 'Join request sent successfully', status: 'PENDING' });
  } catch (error) {
    console.error('Error sending join request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. POST /:roomId/requests/respond - Accept or reject a join request
router.post('/:roomId/requests/respond', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { requesterId, action } = req.body; // action: 'accept' | 'reject'
    const ownerId = req.user.userId;

    if (!requesterId || !action || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'RequesterId and valid action (accept/reject) are required' });
    }

    let room = null;
    if (global.useInMemoryDb) {
      room = rooms.get(roomId);
    } else {
      room = await Room.findOne({ roomId });
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Verify user is room owner
    if (room.ownerId.toString() !== ownerId) {
      return res.status(403).json({ error: 'Only the room owner can manage requests' });
    }

    // Find pending request
    let requestIndex = -1;
    let requestObj = null;

    if (global.useInMemoryDb) {
      requestIndex = roomMembers.findIndex(m => m.roomId === roomId && m.userId === requesterId && m.role === 'PENDING');
      if (requestIndex !== -1) {
        requestObj = roomMembers[requestIndex];
      }
    } else {
      requestObj = await RoomMember.findOne({ roomId, userId: requesterId, role: 'PENDING' });
    }

    if (!requestObj) {
      return res.status(404).json({ error: 'Pending join request not found' });
    }

    const io = req.app.get('io');
    const { emitParticipantsUpdate } = require('../socket/socketUtils');

    if (action === 'accept') {
      // Update role to EDITOR
      if (global.useInMemoryDb) {
        roomMembers[requestIndex].role = 'EDITOR';
      } else {
        requestObj.role = 'EDITOR';
        await requestObj.save();
      }
      
      // Update lists and notify requester
      await emitParticipantsUpdate(io, roomId);
      io.to(requesterId).emit('join_request_accepted', { roomId });
      
      res.json({ message: 'Request accepted. User is now an Editor.' });
    } else {
      // Delete membership entry
      if (global.useInMemoryDb) {
        roomMembers.splice(requestIndex, 1);
      } else {
        await RoomMember.deleteOne({ _id: requestObj._id });
      }
      
      // Update lists and notify requester
      await emitParticipantsUpdate(io, roomId);
      io.to(requesterId).emit('join_request_rejected', { roomId });
      
      res.json({ message: 'Request rejected.' });
    }
  } catch (error) {
    console.error('Error responding to join request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 6. PATCH /:roomId/visibility - Change room visibility (public/private)
router.patch('/:roomId/visibility', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { visibility } = req.body;
    const ownerId = req.user.userId;

    if (!visibility || !['public', 'private'].includes(visibility)) {
      return res.status(400).json({ error: 'Visibility must be public or private' });
    }

    let room = null;
    if (global.useInMemoryDb) {
      room = rooms.get(roomId);
    } else {
      room = await Room.findOne({ roomId });
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.ownerId.toString() !== ownerId) {
      return res.status(403).json({ error: 'Only the room owner can change visibility' });
    }

    if (global.useInMemoryDb) {
      room.visibility = visibility;
      room.updatedAt = new Date();
    } else {
      room.visibility = visibility;
      await room.save();
    }

    res.json({ message: `Room visibility changed to ${visibility}`, room });
  } catch (error) {
    console.error('Error updating room visibility:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 7. PATCH /:roomId/members/:userId/role - Change member role (Promote/Demote)
router.patch('/:roomId/members/:userId/role', authMiddleware, async (req, res) => {
  try {
    const { roomId, userId: targetUserId } = req.params;
    const { role: newRole } = req.body; // newRole: 'EDITOR' | 'VIEWER'
    const ownerId = req.user.userId;

    if (!newRole || !['EDITOR', 'VIEWER'].includes(newRole)) {
      return res.status(400).json({ error: 'Role must be EDITOR or VIEWER' });
    }

    let room = null;
    if (global.useInMemoryDb) {
      room = rooms.get(roomId);
    } else {
      room = await Room.findOne({ roomId });
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Verify owner
    if (room.ownerId.toString() !== ownerId) {
      return res.status(403).json({ error: 'Only the room owner can change user roles' });
    }

    if (targetUserId === ownerId) {
      return res.status(400).json({ error: 'Cannot change the role of the owner' });
    }

    let memberObj = null;
    if (global.useInMemoryDb) {
      memberObj = roomMembers.find(m => m.roomId === roomId && m.userId === targetUserId);
      if (memberObj) {
        memberObj.role = newRole;
      }
    } else {
      memberObj = await RoomMember.findOne({ roomId, userId: targetUserId });
      if (memberObj) {
        memberObj.role = newRole;
        await memberObj.save();
      }
    }

    if (!memberObj) {
      return res.status(404).json({ error: 'Member not found in this room' });
    }

    const io = req.app.get('io');
    const { emitParticipantsUpdate } = require('../socket/socketUtils');
    await emitParticipantsUpdate(io, roomId);
    io.to(targetUserId).emit('role_updated', { roomId, role: newRole });

    res.json({ message: `Role updated to ${newRole}` });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 8. DELETE /:roomId/members/:userId - Remove a user from the room
router.delete('/:roomId/members/:userId', authMiddleware, async (req, res) => {
  try {
    const { roomId, userId: targetUserId } = req.params;
    const ownerId = req.user.userId;

    let room = null;
    if (global.useInMemoryDb) {
      room = rooms.get(roomId);
    } else {
      room = await Room.findOne({ roomId });
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.ownerId.toString() !== ownerId) {
      return res.status(403).json({ error: 'Only the room owner can remove members' });
    }

    if (targetUserId === ownerId) {
      return res.status(400).json({ error: 'Cannot remove the room owner' });
    }

    let deleted = false;
    if (global.useInMemoryDb) {
      const idx = roomMembers.findIndex(m => m.roomId === roomId && m.userId === targetUserId);
      if (idx !== -1) {
        roomMembers.splice(idx, 1);
        deleted = true;
      }
    } else {
      const res = await RoomMember.deleteOne({ roomId, userId: targetUserId });
      deleted = res.deletedCount > 0;
    }

    if (!deleted) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const io = req.app.get('io');
    const { emitParticipantsUpdate } = require('../socket/socketUtils');
    await emitParticipantsUpdate(io, roomId);
    io.to(targetUserId).emit('user_removed', { roomId });

    res.json({ message: 'Member removed from room' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 9. DELETE /:roomId - Delete room
router.delete('/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const ownerId = req.user.userId;

    let room = null;
    if (global.useInMemoryDb) {
      room = rooms.get(roomId);
    } else {
      room = await Room.findOne({ roomId });
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.ownerId.toString() !== ownerId) {
      return res.status(403).json({ error: 'Only the room owner can delete this room' });
    }

    // Perform deletions
    const io = req.app.get('io');
    
    if (global.useInMemoryDb) {
      rooms.delete(roomId);
      
      // Delete all members
      let idx = roomMembers.findIndex(m => m.roomId === roomId);
      while (idx !== -1) {
        roomMembers.splice(idx, 1);
        idx = roomMembers.findIndex(m => m.roomId === roomId);
      }
      
      // Delete all files from memoryStore
      const { files: memFiles } = require('../services/memoryStore');
      Array.from(memFiles.keys()).forEach(fileId => {
        if (memFiles.get(fileId).roomId === roomId) {
          memFiles.delete(fileId);
        }
      });
    } else {
      await Room.deleteOne({ roomId });
      await RoomMember.deleteMany({ roomId });
      const File = require('../models/File');
      await File.deleteMany({ roomId });
    }

    io.to(roomId).emit('room_deleted', { roomId });

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
