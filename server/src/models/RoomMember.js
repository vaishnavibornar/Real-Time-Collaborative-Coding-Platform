const mongoose = require('mongoose');

const RoomMemberSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['OWNER', 'EDITOR', 'VIEWER', 'PENDING'],
    default: 'EDITOR',
    required: true
  }
}, {
  timestamps: true
});

// Compound unique index so a user can only have one role/membership per room
RoomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('RoomMember', RoomMemberSchema);
