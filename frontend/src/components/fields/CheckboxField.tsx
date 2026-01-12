import React from "react";

interface CheckboxFieldProps {
  label: string;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label,
  name,
  checked,
  onChange,
  disabled,
}) => (
  <div className="form-check mb-3">
    <input
      className="form-check-input"
      type="checkbox"
      id={name}
      name={name}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    />
    <label className="form-check-label" htmlFor={name}>
      {label}
    </label>
  </div>
);

export default CheckboxField;
