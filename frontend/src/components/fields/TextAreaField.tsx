import React from "react";

interface TextAreaFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
}

const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  name,
  value,
  onChange,
  disabled,
}) => (
  <div className="mb-3">
    <label className="form-label">{label}</label>
    <textarea
      className="form-control"
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      rows={3}
    />
  </div>
);

export default TextAreaField;
