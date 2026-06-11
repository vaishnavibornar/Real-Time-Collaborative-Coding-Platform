const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  fileId: {
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
  fileName: {
    type: String,
    required: true
  },
  fileContent: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'javascript'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('File', FileSchema);
