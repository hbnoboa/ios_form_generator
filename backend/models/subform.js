// backend/models/subform.js
// fields: [{ name, type, label, row, col, colSpan }]
const subformSchema = {
  formId: String, // ID do formulário "pai"
  name: String,
  desc: String,
  fields: Array, // [{ name: String, type: String, label: String, row: Number, col: Number, colSpan: Number }]
  org: Array,
  createdBy: String,
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
};
module.exports = subformSchema;
