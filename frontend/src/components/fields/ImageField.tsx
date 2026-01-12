import React from "react";

interface ImageFieldProps {
  name?: string;
  label?: string;
  required?: boolean;
  value?: string; // URL da imagem ou base64
  onChange?: (value: string | null) => void;
  readOnly?: boolean;
  camera?: boolean; // Se true, só permite câmera
}

const ImageField: React.FC<ImageFieldProps> = ({
  name,
  label,
  required,
  value,
  onChange,
  readOnly = false,
  camera = false,
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
          <img
            src={value}
            alt={label || name}
            style={{
              maxWidth: "100%",
              maxHeight: 200,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          />
        ) : (
          <div className="text-muted">Nenhuma imagem</div>
        )
      ) : (
        <input
          type="file"
          name={name}
          accept="image/*"
          required={!!required}
          className="form-control"
          onChange={handleChange}
          {...(camera ? { capture: "environment" } : {})}
        />
      )}
    </div>
  );
};

export default ImageField;
