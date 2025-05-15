const mongoose = require('mongoose');

// Schema para gerenciar contadores automáticos para IDs sequenciais
const counterSchema = new mongoose.Schema({
  // Nome da entidade (Account, Campaign, Email, etc.)
  entity: {
    type: String,
    required: true,
    unique: true
  },
  // Próximo valor sequencial
  seq: {
    type: Number,
    default: 1
  }
});

// Função estática para obter o próximo ID para uma entidade
counterSchema.statics.getNextSequence = async function(entityName) {
  const counter = await this.findOneAndUpdate(
    { entity: entityName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;
