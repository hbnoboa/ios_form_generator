// backend/models/subrecord.js
const subrecordSchema = {
  record: String, // ID do registro respondido
  subform: String, // ID do subformulário respondido
  createdBy: String, // Quem preencheu
  data: Object, // { campo1: valor, campo2: valor }
  org: Array,
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
};
module.exports = subrecordSchema;
