import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../contexts/authContext";

export interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
  type?: string;
}

interface SubrecordColumnChooserProps {
  fields: ColumnDef[];
  setFields: (updater: (prev: ColumnDef[]) => ColumnDef[]) => void;
  onClose: () => void;
  subformId: string;
}

const SubrecordColumnChooser: React.FC<SubrecordColumnChooserProps> = ({
  fields,
  setFields,
  onClose,
  subformId,
}) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const handleFieldChange = (
    idx: number,
    prop: keyof ColumnDef,
    value: any
  ) => {
    setFields((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [prop]: value };
      return updated;
    });
  };

  const moveField = (idx: number, direction: -1 | 1) => {
    setFields((prev) => {
      const updated = [...prev];
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= updated.length) return updated;
      const temp = updated[idx];
      updated[idx] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user || !subformId) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      await axios.put(
        `/api/subforms/${subformId}`,
        { headers: fields },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onClose();
    } catch (err) {
      alert("Erro ao salvar colunas do subregistro no servidor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal d-block"
      tabIndex={-1}
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Editar colunas (Subregistros)</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            {fields.map((field, idx) => (
              <div className="d-flex align-items-center mb-2" key={field.key}>
                <input
                  type="checkbox"
                  className="form-check-input me-2"
                  checked={field.visible}
                  onChange={(e) =>
                    handleFieldChange(idx, "visible", e.target.checked)
                  }
                />
                <input
                  type="text"
                  className="form-control me-2"
                  value={field.label}
                  onChange={(e) =>
                    handleFieldChange(idx, "label", e.target.value)
                  }
                  style={{ maxWidth: 180 }}
                />
                <span className="text-muted me-2">({field.key})</span>
                <button
                  className="btn btn-sm btn-outline-secondary me-1"
                  style={{ padding: "0.15rem 0.5rem" }}
                  disabled={idx === 0}
                  onClick={() => moveField(idx, -1)}
                  title="Mover para cima"
                >
                  ↑
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  style={{ padding: "0.15rem 0.5rem" }}
                  disabled={idx === fields.length - 1}
                  onClick={() => moveField(idx, 1)}
                  title="Mover para baixo"
                >
                  ↓
                </button>
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubrecordColumnChooser;
