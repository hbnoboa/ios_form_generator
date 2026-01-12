import React from "react";

interface DateFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const DateField: React.FC<DateFieldProps> = ({
  label,
  name,
  value,
  onChange,
  disabled,
}) => (
  <div className="mb-3">
    <label className="form-label">{label}</label>
    <input
      type="datetime-local"
      className="form-control"
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  </div>
);

export default DateField;
