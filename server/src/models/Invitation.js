const mongoose = require('mongoose');

const InvitationSchema = new mongoose.Schema({
  invitationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  roomId: {
    type: String,
    required: true,
    index: true
  },
  invitedEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Invitation', InvitationSchema);
