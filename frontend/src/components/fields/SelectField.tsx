import React from "react";

interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  options: string[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  emptyLabel?: string; // label to show for empty option ""
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  value,
  options,
  onChange,
  disabled,
  emptyLabel,
}) => (
  <div className="mb-3">
    <label className="form-label">{label}</label>
    <select
      className="form-select"
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
    >
      {options.map((opt, idx) => (
        <option key={opt !== "" ? opt : `empty-${idx}`} value={opt}>
          {opt === "" ? emptyLabel ?? "" : opt}
        </option>
      ))}
    </select>
  </div>
);

export default SelectField;
