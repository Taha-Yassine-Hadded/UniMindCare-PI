const mongoose = require("mongoose");

const exitRequestSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reason: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  priority: { type: Number, default: 0 }, // Priorité calculée par l'IA
  exitOrder: { type: Number, default: null }, // Ordre de sortie attribué par IA

  status: { type: String, default: "pending", enum: ["pending", "approved", "rejected"] },
});

module.exports = mongoose.model("ExitRequest", exitRequestSchema);