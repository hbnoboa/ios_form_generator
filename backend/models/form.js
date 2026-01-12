const formSchema = {
  name: String,
  desc: String,
  fields: [
    {
      name: String,
      type: String,
      label: String,
      row: Number,
      col: Number,
      colSpan: Number,
    },
  ],
  org: Array,
  createdBy: String,
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
};

module.exports = formSchema;
