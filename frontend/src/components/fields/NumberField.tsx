import React from "react";

interface NumberFieldProps {
  label: string;
  name: string;
  value: number | string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const NumberField: React.FC<NumberFieldProps> = ({
  label,
  name,
  value,
  onChange,
  disabled,
}) => (
  <div className="mb-3">
    <label className="form-label">{label}</label>
    <input
      type="number"
      className="form-control"
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  </div>
);

export default NumberField;
