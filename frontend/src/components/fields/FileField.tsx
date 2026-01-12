import React from "react";

interface FileFieldProps {
  name?: string;
  label?: string;
  required?: boolean;
  value?: string; // URL do arquivo ou nome
  onChange?: (value: string | null) => void;
  readOnly?: boolean;
  accept?: string;
}

const FileField: React.FC<FileFieldProps> = ({
  name,
  label,
  required,
  value,
  onChange,
  readOnly = false,
  accept,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      if (onChange) onChange(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (onChange) onChange(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mb-3">
      {label && <label className="form-label">{label}</label>}
      {readOnly ? (
        value ? (
          <a href={value} target="_blank" rel="noreferrer" className="d-block">
            Baixar arquivo
          </a>
        ) : (
          <div className="text-muted">Nenhum arquivo</div>
        )
      ) : (
        <input
          type="file"
          name={name}
          required={!!required}
          className="form-control"
          accept={accept}
          onChange={handleChange}
        />
      )}
    </div>
  );
};

export default FileField;
