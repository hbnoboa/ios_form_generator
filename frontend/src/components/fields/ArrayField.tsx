import React from "react";

interface ArrayFieldProps {
  label?: string;
  name?: string;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ArrayField: React.FC<ArrayFieldProps> = ({
  label,
  name,
  value,
  onChange,
  disabled = false,
  placeholder = "Digite um valor e pressione Enter",
}) => {
  const handleAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const input = e.currentTarget;
      const val = input.value.trim();
      if (val && !value.includes(val)) {
        onChange([...value, val]);
        input.value = "";
      }
    }
  };

  const handleRemove = (idx: number) => {
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div className="mb-3">
      {label && <label className="form-label">{label}</label>}
      <div className="d-flex flex-wrap gap-2 mb-2">
        {value.map((item, idx) => (
          <span
            key={idx}
            className="badge bg-secondary d-flex align-items-center"
            style={{ fontSize: 14, padding: "0.5em 0.75em" }}
          >
            {item}
            {!disabled && (
              <button
                type="button"
                className="btn-close btn-close-white ms-2"
                aria-label="Remover"
                style={{ fontSize: 10, marginLeft: 8 }}
                onClick={() => handleRemove(idx)}
              />
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <input
          type="text"
          className="form-control"
          name={name}
          placeholder={placeholder}
          onKeyDown={handleAdd}
          disabled={disabled}
        />
      )}
    </div>
  );
};

export default ArrayField;
