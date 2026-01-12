// backend/models/record.js
const recordSchema = {
  formId: String, // ID do formulário respondido
  createdBy: String, // Quem preencheu
  data: Object, // { campo1: valor, campo2: valor }
  org: Array,
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
};
module.exports = recordSchema;
