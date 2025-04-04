const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: String,
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const Class = mongoose.model('Class', classSchema);
module.exports = Class;