import React from "react";

interface SelectOptionsEditorProps {
  options: string[];
  onChange: (opts: string[]) => void;
}

const SelectOptionsEditor: React.FC<SelectOptionsEditorProps> = ({
  options,
  onChange,
}) => {
  const list = options?.length ? options : [""];
  const setOpt = (idx: number, val: string) => {
    const next = [...(options || [])];
    next[idx] = val;
    onChange(next);
  };
  const removeOpt = (idx: number) => {
    const next = [...(options || [])];
    next.splice(idx, 1);
    onChange(next);
  };
  const addOpt = () => onChange([...(options || []), ""]);
  return (
    <div>
      <label className="form-label">Opções</label>
      {list.map((opt, i) => (
        <div key={i} className="d-flex gap-2 mb-2">
          <input
            type="text"
            className="form-control form-control-sm"
            value={opt}
            placeholder={`Opção ${i + 1}`}
            onBlur={(e) => setOpt(i, e.target.value)}
            onChange={(e) => setOpt(i, e.target.value)}
          />
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => removeOpt(i)}
            title="Remover opção"
            style={{
              width: 28,
              height: 28,
              padding: 0,
              lineHeight: "26px",
              textAlign: "center",
              borderRadius: "50%",
            }}
            disabled={list.length <= 1}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        onClick={addOpt}
      >
        Adicionar opção
      </button>
    </div>
  );
};

export default SelectOptionsEditor;
