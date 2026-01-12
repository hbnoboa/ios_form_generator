import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import SelectOptionsEditor from "../../components/fields/SelectOptionsEditor";
import HotspotImageField, {
  Hotspot,
} from "../../components/fields/HotspotImageField";
import FormDataSelect from "../../components/fields/FormDataSelect";
type FieldType =
  | "text"
  | "number"
  | "select"
  | "form-data-select"
  | "date"
  | "area"
  | "check"
  | "map"
  | "file"
  | "image"
  | "hotspot"
  | "done";

interface FieldConfig {
  type: FieldType;
  label: string;
  name: string;
  value?: any;
  options?: string[];
  hotspots?: Hotspot[];
  imageUrl?: string;
  camera?: boolean;
  // Configurações para form-data-select
  sourceFormId?: string;
  sourceFormName?: string;
  sourceFieldName?: string;
}
const NewFormPage: React.FC = () => {
  const { user, claims } = useAuth();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [lines, setLines] = useState<any[]>([]);
  const navigate = useNavigate();
  const role = claims?.role as string | undefined;
  const isManagerOrAdmin = role === "Admin" || role === "Manager";
  if (!isManagerOrAdmin) return <Navigate to="/forms" replace />;

  const addLine = (columns: number, idx?: number) => {
    const newLine = {
      columns,
      fields: [
        {
          type: "text" as FieldType,
          label: "",
          name: "",
          value: "",
          options: [],
        },
      ],
    };
    setLines((prev) => {
      if (typeof idx === "number") {
        const copy = [...prev];
        copy.splice(idx + 1, 0, newLine);
        return copy;
      }
      return [...prev, newLine];
    });
  };

  const setLineColumns = (lineIdx: number, columns: number) => {
    setLines((prev) => {
      const copy = [...prev];
      const line = { ...copy[lineIdx] };
      let fields = [...line.fields];
      if (fields.length < columns) {
        for (let i = fields.length; i < columns; i++) {
          fields.push({
            type: "text" as FieldType,
            label: "",
            name: "",
            value: "",
            options: [],
          });
        }
      } else if (fields.length > columns) {
        fields = fields.slice(0, columns);
      }
      line.columns = columns;
      line.fields = fields;
      copy[lineIdx] = line;
      return copy;
    });
  };

  const setFieldType = (lineIdx: number, fieldIdx: number, type: FieldType) => {
    setLines((prev) => {
      const copy = [...prev];
      const fields = [...copy[lineIdx].fields];
      fields[fieldIdx] = {
        ...fields[fieldIdx],
        type,
        options: type === "select" ? fields[fieldIdx].options || [""] : [],
        // Extras para form-data-select
        sourceFormId:
          type === "form-data-select"
            ? fields[fieldIdx].sourceFormId
            : undefined,
        sourceFormName:
          type === "form-data-select"
            ? (fields[fieldIdx] as any).sourceFormName
            : undefined,
        sourceFieldName:
          type === "form-data-select"
            ? fields[fieldIdx].sourceFieldName
            : undefined,
        value: "",
      };
      copy[lineIdx] = { ...copy[lineIdx], fields };
      return copy;
    });
  };

  const setFieldLabel = (lineIdx: number, fieldIdx: number, label: string) => {
    setLines((prev) => {
      const copy = [...prev];
      const fields = [...copy[lineIdx].fields];
      fields[fieldIdx] = { ...fields[fieldIdx], label };
      copy[lineIdx] = { ...copy[lineIdx], fields };
      return copy;
    });
  };

  const getColClass = (columns: number) => {
    switch (columns) {
      case 4:
        return "col-3";
      case 3:
        return "col-4";
      case 2:
        return "col-6";
      case 1:
        return "col-12";
      default:
        return "col";
    }
  };

  const handleSubmit = async () => {
    try {
      if (!user) throw new Error("Usuário não autenticado");
      const token = await user.getIdToken();
      // Monta as linhas com col, row e colSpan, e garante name = slug(label)
      const linesWithGrid = lines.map((line: any, rowIdx: number) => ({
        ...line,
        fields: line.fields.map((field: FieldConfig, colIdx: number) => ({
          ...field,
          name: field.label,
          row: rowIdx,
          col: colIdx,
          colSpan: 1, // pode ser ajustado se quiser permitir colSpan customizável
        })),
      }));
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, desc, lines: linesWithGrid }),
      });
      if (!res.ok) throw new Error("Erro ao salvar formulário");
      const data = await res.json();
      navigate(`/forms/${data.id}`);
    } catch (err) {
      alert("Erro ao salvar formulário");
    }
  };

  return (
    <div className="container mt-4">
      <h2>Novo Formulário</h2>
      <div className="mb-3 d-flex align-items-end gap-2">
        <div className="flex-grow-1">
          <label className="form-label">Nome do relatório</label>
          <input
            type="text"
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button
          className="btn btn-primary mb-1"
          type="button"
          onClick={handleSubmit}
        >
          Salvar formulário
        </button>
      </div>
      <div className="mb-3">
        <label className="form-label">Descrição</label>
        <textarea
          className="form-control"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>
      <button
        className="btn btn-success mb-3"
        onClick={() => addLine(1)}
        type="button"
      >
        Adicionar linha
      </button>
      {lines.map((line: any, lineIdx: number) => (
        <div key={lineIdx} className="mb-4 border rounded p-3 bg-dark">
          <div className="d-flex align-items-center mb-2">
            <span className="me-2">Linha {lineIdx + 1}:</span>
            <label className="me-2">Colunas:</label>
            <select
              value={line.columns}
              onChange={(e) => setLineColumns(lineIdx, Number(e.target.value))}
              className="form-select form-select-sm w-auto"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              className="btn btn-outline-primary btn-sm ms-3"
              type="button"
              onClick={() => addLine(1, lineIdx)}
            >
              Inserir linha abaixo
            </button>
            {lines.length > 1 && (
              <button
                className="btn btn-outline-danger btn-sm ms-2"
                type="button"
                onClick={() => {
                  setLines((prev) => prev.filter((_, idx) => idx !== lineIdx));
                }}
              >
                Excluir linha
              </button>
            )}
          </div>
          <div className="row">
            {line.fields.map((field: FieldConfig, fieldIdx: number) => (
              <div className={getColClass(line.columns)} key={fieldIdx}>
                <div className="card mb-2">
                  <div className="card-body">
                    <div className="mb-2">
                      <label className="form-label">Tipo:</label>
                      <select
                        value={field.type}
                        onChange={(e) =>
                          setFieldType(
                            lineIdx,
                            fieldIdx,
                            e.target.value as FieldType
                          )
                        }
                        className="form-select form-select-sm"
                      >
                        <option value="text">Texto</option>
                        <option value="area">Área de texto</option>
                        <option value="number">Número</option>
                        <option value="select">Select</option>
                        <option value="form-data-select">
                          Select de outro formulário
                        </option>
                        <option value="date">Data</option>
                        <option value="check">Checkbox</option>
                        <option value="map">Mapa</option>
                        <option value="file">Arquivo</option>
                        <option value="image">Imagem</option>
                        <option value="hotspot">Hotspot</option>
                        <option value="done">Finalizado (invisível)</option>
                        <option value="array">Lista</option>
                      </select>
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Nome:</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={field.label}
                        onChange={(e) =>
                          setFieldLabel(lineIdx, fieldIdx, e.target.value)
                        }
                      />
                    </div>
                    {field.type === "image" && (
                      <div className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`camera-checkbox-${lineIdx}-${fieldIdx}`}
                          checked={!!field.camera}
                          onChange={(e) => {
                            setLines((prev) => {
                              const lines = [...prev];
                              const fields = [...lines[lineIdx].fields];
                              fields[fieldIdx] = {
                                ...fields[fieldIdx],
                                camera: e.target.checked,
                              };
                              lines[lineIdx].fields = fields;
                              return lines;
                            });
                          }}
                        />
                        <label
                          className="form-check-label"
                          htmlFor={`camera-checkbox-${lineIdx}-${fieldIdx}`}
                        >
                          Usar apenas câmera (não permite galeria)
                        </label>
                      </div>
                    )}
                    {field.type === "select" && (
                      <>
                        <SelectOptionsEditor
                          options={field.options || [""]}
                          onChange={(opts) => {
                            setLines((prev) => {
                              const lines = [...prev];
                              const fields = [...lines[lineIdx].fields];
                              fields[fieldIdx] = {
                                ...fields[fieldIdx],
                                options: opts,
                              };
                              lines[lineIdx].fields = fields;
                              return lines;
                            });
                          }}
                        />
                      </>
                    )}
                    {field.type === "form-data-select" && (
                      <div className="mt-2">
                        <FormDataSelect
                          label="Select de outro formulário"
                          value={""}
                          disabled={false}
                          initialFormId={field.sourceFormId}
                          initialFieldName={field.sourceFieldName}
                          hideSourceSelectors={false}
                          showValueSelect={false}
                          onChange={() => {}}
                          onSourceChange={({ formId, formName, fieldName }) => {
                            setLines((prev) => {
                              const lines = [...prev];
                              const fields = [...lines[lineIdx].fields];
                              fields[fieldIdx] = {
                                ...fields[fieldIdx],
                                sourceFormId: formId,
                                sourceFormName: formName,
                                sourceFieldName: fieldName,
                              } as any;
                              lines[lineIdx].fields = fields;
                              return lines;
                            });
                          }}
                        />
                      </div>
                    )}

                    {field.type === "hotspot" && (
                      <div>
                        <HotspotImageField
                          imageUrl={field.imageUrl || "/placeholder.jpg"}
                          hotspots={field.value?.hotspots || []}
                          width={320}
                          height={200}
                          readOnly={false}
                          showFileInput={true}
                          onImageChange={(img) => {
                            setLines((prev) => {
                              const lines = [...prev];
                              const fields = [...lines[lineIdx].fields];
                              fields[fieldIdx] = {
                                ...fields[fieldIdx],
                                imageUrl: img,
                                value: {
                                  ...(fields[fieldIdx].value || {}),
                                  imageUrl: img,
                                  hotspots:
                                    fields[fieldIdx].value?.hotspots || [],
                                },
                              };
                              lines[lineIdx].fields = fields;
                              return lines;
                            });
                          }}
                          onHotspotsChange={(hotspots) => {
                            setLines((prev) => {
                              const lines = [...prev];
                              const fields = [...lines[lineIdx].fields];
                              fields[fieldIdx] = {
                                ...fields[fieldIdx],
                                value: {
                                  ...(fields[fieldIdx].value || {}),
                                  imageUrl: fields[fieldIdx].imageUrl,
                                  hotspots,
                                },
                              };
                              lines[lineIdx].fields = fields;
                              return lines;
                            });
                          }}
                        />
                        <div className="mt-2">
                          <label className="form-label">
                            (Edite os pontos e opções diretamente na imagem
                            acima)
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-secondary mt-2"
        onClick={() => navigate(-1)}
      >
        Voltar
      </button>
    </div>
  );
};

export default NewFormPage;
