import React from "react";

interface TextFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const TextField: React.FC<TextFieldProps> = ({
  label,
  name,
  value,
  onChange,
  disabled,
}) => (
  <div className="mb-3">
    <label className="form-label">{label}</label>
    <input
      type="text"
      className="form-control"
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  </div>
);

export default TextField;
