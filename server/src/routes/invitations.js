const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const authMiddleware = require('../middleware/authMiddleware');
const Room = require('../models/Room');
const RoomMember = require('../models/RoomMember');
const Invitation = require('../models/Invitation');
const { rooms, roomMembers, invitations } = require('../services/memoryStore');

// Helper to send email or print in console
const sendInvitationEmail = async (roomName, roomId, invitedEmail, invitationId) => {
  const joinLink = `http://localhost:3000/room/${roomId}?inviteId=${invitationId}`;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CollabEditor" <invitations@collabeditor.local>',
    to: invitedEmail,
    subject: `You've been invited to join the room "${roomName}"`,
    text: `You have been invited to collaborate in the room "${roomName}".\n\nRoom ID: ${roomId}\nJoin Link: ${joinLink}\n\nClick the link above to log in and start coding!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb;">Collaborative Coding Platform</h2>
        <p>You have been invited to collaborate in the room: <strong>${roomName}</strong>.</p>
        <p><strong>Room ID:</strong> <code>${roomId}</code></p>
        <div style="margin: 24px 0;">
          <a href="${joinLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Join Room Workspace</a>
        </div>
        <p style="font-size: 0.8em; color: #666;">If the button above doesn't work, copy and paste this link into your browser: <br/> ${joinLink}</p>
      </div>
    `
  };

  const hasConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (hasConfig) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      await transporter.sendMail(mailOptions);
      console.log(`[Email] Invitation email sent to ${invitedEmail} via SMTP`);
    } catch (err) {
      console.error(`[Email] Failed to send email via SMTP, falling back to log:`, err);
    }
  } else {
    // Zero-config Console Log mode
    console.log('\n============================================================');
    console.log('📬 INVITATION EMAIL EMULATED (No SMTP credentials configured)');
    console.log(`To: ${invitedEmail}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log(`Body:\n${mailOptions.text}`);
    console.log('============================================================\n');
  }
};

// POST /invite - Send email invitation
router.post('/invite', authMiddleware, async (req, res) => {
  try {
    const { roomId, email } = req.body;
    const userId = req.user.userId;

    if (!roomId || !email) {
      return res.status(400).json({ error: 'RoomId and email are required' });
    }

    const invitedEmail = email.toLowerCase().trim();

    // 1. Verify user is room owner
    let room = null;
    let isOwner = false;

    if (global.useInMemoryDb) {
      room = rooms.get(roomId);
      if (room) {
        isOwner = room.ownerId === userId;
      }
    } else {
      room = await Room.findOne({ roomId });
      if (room) {
        isOwner = room.ownerId.toString() === userId;
      }
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!isOwner) {
      return res.status(403).json({ error: 'Only the room owner can invite users' });
    }

    // 2. Create invitation record
    const invitationId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    
    if (global.useInMemoryDb) {
      const newInvite = {
        invitationId,
        roomId,
        invitedEmail,
        invitedBy: userId,
        status: 'pending',
        createdAt: new Date()
      };
      invitations.set(invitationId, newInvite);
    } else {
      const dbInvite = new Invitation({
        invitationId,
        roomId,
        invitedEmail,
        invitedBy: userId,
        status: 'pending'
      });
      await dbInvite.save();
    }

    // 3. Send/Log Email
    await sendInvitationEmail(room.roomName, roomId, invitedEmail, invitationId);

    res.json({ message: 'Invitation sent successfully', invitationId });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /accept - Accept invitation
router.post('/accept', authMiddleware, async (req, res) => {
  try {
    const { invitationId } = req.body;
    const userId = req.user.userId;
    const userEmail = req.user.email.toLowerCase().trim();

    if (!invitationId) {
      return res.status(400).json({ error: 'Invitation ID is required' });
    }

    let invitation = null;

    if (global.useInMemoryDb) {
      invitation = invitations.get(invitationId);
    } else {
      invitation = await Invitation.findOne({ invitationId });
    }

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Invitation has already been processed' });
    }

    // Check if the user email matches the invited email
    if (invitation.invitedEmail !== userEmail) {
      return res.status(403).json({ error: 'This invitation belongs to a different email address' });
    }

    // Update invitation status to accepted
    if (global.useInMemoryDb) {
      invitation.status = 'accepted';
      
      // Add member to room members
      const memberExists = roomMembers.some(
        m => m.roomId === invitation.roomId && m.userId === userId
      );

      if (!memberExists) {
        roomMembers.push({
          roomId: invitation.roomId,
          userId,
          role: 'EDITOR',
          createdAt: new Date()
        });
      }
    } else {
      invitation.status = 'accepted';
      await invitation.save();

      // Upsert RoomMember record
      await RoomMember.findOneAndUpdate(
        { roomId: invitation.roomId, userId },
        { $setOnInsert: { roomId: invitation.roomId, userId, role: 'EDITOR' } },
        { upsert: true, new: true }
      );
    }

    res.json({ message: 'Invitation accepted successfully', roomId: invitation.roomId });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
