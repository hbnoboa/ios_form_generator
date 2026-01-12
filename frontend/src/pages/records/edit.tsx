import React, { useEffect, useState } from "react";
import {
  useParams,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import axios from "axios";
import MapField from "../../components/fields/MapField";
import HotspotImageField from "../../components/fields/HotspotImageField";
import FormDataSelect from "../../components/fields/FormDataSelect";
import { askDone } from "../../components/fields/DoneField";
import { storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../contexts/authContext";

// Função para formatar data como dd/mm/yyyy hh:mm:ss
function formatDate(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    pad(date.getDate()) +
    "/" +
    pad(date.getMonth() + 1) +
    "/" +
    date.getFullYear() +
    " " +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds())
  );
}

// Converte valores de data para o formato esperado por inputs datetime-local (YYYY-MM-DDTHH:MM)
function toDateTimeLocalValue(v: any): string {
  if (!v) return "";
  try {
    let d: Date;
    if (typeof v === "string") {
      d = new Date(v);
    } else if (typeof v === "number") {
      d = new Date(v);
    } else if (v && typeof v === "object" && "_seconds" in v) {
      d = new Date((v as any)._seconds * 1000);
    } else {
      d = new Date(v);
    }
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

const EditRecordPage: React.FC = () => {
  const { user, claims } = useAuth();
  const { id: recordId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  // Get recordId from query string if not in params
  const searchParams = new URLSearchParams(location.search);
  const recordIdFromQuery = searchParams.get("recordId");
  const effectiveRecordId = recordId || recordIdFromQuery;

  useEffect(() => {
    if (!user || !effectiveRecordId) return;
    setLoading(true);
    user.getIdToken().then(async (token: string) => {
      try {
        // 1. Busca o registro
        const recordRes = await axios.get(`/api/records/${effectiveRecordId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const record = recordRes.data;
        // Extrai apenas os valores dos campos para edição
        if (record.recordData) {
          const vals: Record<string, any> = {};
          Object.keys(record.recordData).forEach((key) => {
            const fieldObj = record.recordData[key];
            vals[key] =
              fieldObj && typeof fieldObj === "object" && "value" in fieldObj
                ? fieldObj.value
                : fieldObj;
          });
          setValues(vals);
        } else {
          setValues({});
        }
        // 2. Busca o form
        const formRes = await axios.get(`/api/forms/${record.formId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setForm(formRes.data);
        console.log("Dados do registro carregado:", record);
        setLoading(false);
      } catch (err: any) {
        setError(
          err.response?.data?.error || "Erro ao buscar registro/formulário"
        );
        setLoading(false);
      }
    });
  }, [user, effectiveRecordId]);

  const role = (claims?.role as string) || "";
  const isNotUser = role !== "User";
  if (!isNotUser)
    return (
      <Navigate
        to={
          effectiveRecordId
            ? `/records?formId=${effectiveRecordId}`
            : "/records"
        }
        replace
      />
    );

  const handleChange = (name: string, value: any) => {
    setValues((prev: any) => {
      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form) return;
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const hasDone = Array.isArray(form.fields)
        ? form.fields.some((f: any) => f.type === "done")
        : false;
      const finalizar = hasDone ? await askDone() : false;
      // Monta o objeto dataToSend com tipo junto ao valor
      const dataToSend: Record<string, any> = {};
      for (const field of form.fields) {
        let value = values[field.name];
        if (field.type === "done") {
          value = finalizar === true;
        }
        // Upload de arquivos/imagens para o Firebase Storage
        if (
          (field.type === "image" || field.type === "file") &&
          values[field.name] instanceof File
        ) {
          const file = values[field.name];
          const storageRef = ref(
            storage,
            `records/${form.id}/${field.name}_${Date.now()}_${file.name}`
          );
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          value = { url, name: file.name };
        }
        // Salva o tipo junto ao valor
        dataToSend[field.name] = { value, type: field.type };
      }
      const payload = {
        recordData: dataToSend,
        createdBy: user.email,
        org: form?.org,
        updatedAt: formatDate(new Date()),
      };
      await axios.put(`/api/records/${effectiveRecordId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate(`/records?formId=${form.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao atualizar registro");
    }
    setSubmitting(false);
  };

  if (loading) return <div className="container mt-4">Carregando...</div>;
  if (error) return <div className="container mt-4 text-danger">{error}</div>;
  if (!form) return null;

  // Agrupar campos por linha (row)
  const fieldsByRow: Record<number, any[]> = {};
  (form.fields || []).forEach((field: any) => {
    if (!fieldsByRow[field.row]) fieldsByRow[field.row] = [];
    fieldsByRow[field.row].push(field);
  });

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-body">
          <h2>Editar Registro: {form.name}</h2>
          <form onSubmit={handleSubmit}>
            {Object.keys(fieldsByRow)
              .sort((a, b) => Number(a) - Number(b))
              .map((rowIdx) => (
                <div className="row mb-3" key={rowIdx}>
                  {fieldsByRow[Number(rowIdx)]
                    .sort((a, b) => a.col - b.col)
                    .map((field: any, fieldIdx: number) => {
                      if (field.type === "done") return null; // invisível
                      const colClass =
                        fieldsByRow[Number(rowIdx)].length === 4
                          ? "col-3"
                          : fieldsByRow[Number(rowIdx)].length === 3
                          ? "col-4"
                          : fieldsByRow[Number(rowIdx)].length === 2
                          ? "col-6"
                          : "col-12";
                      return (
                        <div className={colClass} key={fieldIdx}>
                          <div className="mb-2">
                            <label className="form-label">{field.label}</label>
                            {/* Field rendering */}
                            {field.type === "hotspot" && (
                              <div style={{ textAlign: "center" }}>
                                <HotspotImageField
                                  imageUrl={
                                    field.value?.imageUrl ||
                                    field.imageUrl ||
                                    "/placeholder.jpg"
                                  }
                                  hotspots={
                                    field.value?.hotspots ||
                                    field.hotspots ||
                                    []
                                  }
                                  readOnly={true}
                                  width="100%"
                                  height={200}
                                />
                                <div
                                  style={{ marginTop: 12, textAlign: "left" }}
                                >
                                  <label className="form-label">
                                    Selecione um item do hotspot:
                                  </label>
                                  <select
                                    className="form-select"
                                    value={values[field.name] || ""}
                                    onChange={(e) =>
                                      handleChange(field.name, e.target.value)
                                    }
                                  >
                                    <option value="">Selecione...</option>
                                    {(
                                      field.value?.hotspots ||
                                      field.hotspots ||
                                      []
                                    ).map((hotspot: any, idx: number) =>
                                      (hotspot.options || []).map(
                                        (opt: string, i: number) => (
                                          <option
                                            key={idx + "-" + i}
                                            value={`hotspot${idx}:${opt}`}
                                          >
                                            {`Ponto ${idx + 1}: ${opt}`}
                                          </option>
                                        )
                                      )
                                    )}
                                  </select>
                                </div>
                              </div>
                            )}
                            {field.type === "array" && (
                              <div>
                                {(Array.isArray(values[field.name])
                                  ? values[field.name]
                                  : []
                                ).map((item: string, idx: number) => (
                                  <div
                                    className="input-group mb-1"
                                    key={field.name + "-" + idx}
                                  >
                                    <input
                                      type="text"
                                      className="form-control"
                                      value={item}
                                      onChange={(e) => {
                                        const arr = Array.isArray(
                                          values[field.name]
                                        )
                                          ? [...values[field.name]]
                                          : [];
                                        arr[idx] = e.target.value;
                                        handleChange(field.name, arr);
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-danger"
                                      onClick={() => {
                                        const arr = Array.isArray(
                                          values[field.name]
                                        )
                                          ? [...values[field.name]]
                                          : [];
                                        arr.splice(idx, 1);
                                        handleChange(field.name, arr);
                                      }}
                                    >
                                      -
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    const arr = Array.isArray(
                                      values[field.name]
                                    )
                                      ? [...values[field.name]]
                                      : [];
                                    arr.push("");
                                    handleChange(field.name, arr);
                                  }}
                                >
                                  Adicionar item
                                </button>
                              </div>
                            )}
                            {field.type === "number" && (
                              <input
                                type="number"
                                className="form-control"
                                value={values[field.name] ?? ""}
                                onChange={(e) =>
                                  handleChange(field.name, e.target.value)
                                }
                              />
                            )}
                            {field.type === "text" && (
                              <input
                                type="text"
                                className="form-control"
                                value={values[field.name] ?? ""}
                                onChange={(e) =>
                                  handleChange(field.name, e.target.value)
                                }
                              />
                            )}
                            {field.type === "area" && (
                              <textarea
                                className="form-control"
                                rows={3}
                                value={values[field.name] ?? ""}
                                onChange={(e) =>
                                  handleChange(field.name, e.target.value)
                                }
                              />
                            )}
                            {field.type === "select" && (
                              <select
                                className="form-select"
                                value={values[field.name] ?? ""}
                                onChange={(e) =>
                                  handleChange(field.name, e.target.value)
                                }
                              >
                                <option value="">Selecione...</option>
                                {(field.options || []).map(
                                  (opt: string, idx: number) => (
                                    <option
                                      key={opt !== "" ? opt : `empty-${idx}`}
                                      value={opt}
                                    >
                                      {opt}
                                    </option>
                                  )
                                )}
                              </select>
                            )}
                            {field.type === "form-data-select" && (
                              <FormDataSelect
                                label={field.label}
                                value={values[field.name]}
                                onChange={(v) => handleChange(field.name, v)}
                                hideSourceSelectors={true}
                                initialFormId={
                                  field.sourceFormId ||
                                  field.formSourceId ||
                                  field.formIdSource
                                }
                                initialFieldName={
                                  field.sourceFieldName ||
                                  field.fieldSourceName ||
                                  field.fieldNameSource
                                }
                              />
                            )}
                            {field.type === "date" && (
                              <input
                                type="datetime-local"
                                className="form-control"
                                value={toDateTimeLocalValue(values[field.name])}
                                onChange={(e) =>
                                  handleChange(field.name, e.target.value)
                                }
                              />
                            )}
                            {field.type === "check" && (
                              <div className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={!!values[field.name]}
                                  onChange={(e) =>
                                    handleChange(field.name, e.target.checked)
                                  }
                                />
                              </div>
                            )}
                            {field.type === "map" && (
                              <MapField
                                key={
                                  values[field.name] &&
                                  values[field.name].lat != null &&
                                  values[field.name].lng != null
                                    ? `${field.name}-${
                                        values[field.name].lat
                                      },${values[field.name].lng}`
                                    : field.name
                                }
                                initialValue={
                                  values[field.name] &&
                                  values[field.name].lat != null &&
                                  values[field.name].lng != null
                                    ? values[field.name]
                                    : undefined
                                }
                                readOnly={false}
                                height={180}
                                width="100%"
                                onChange={(val) =>
                                  handleChange(field.name, val)
                                }
                              />
                            )}
                            {field.type === "image" && (
                              <div style={{ textAlign: "center" }}>
                                <input
                                  type="file"
                                  className="form-control"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file =
                                      e.target.files && e.target.files[0];
                                    if (file) handleChange(field.name, file);
                                  }}
                                />
                                {/* Mostrar imagem já existente, seja string (url) ou objeto com url */}
                                {values[field.name] &&
                                  (typeof values[field.name] === "string" ? (
                                    <img
                                      src={values[field.name]}
                                      alt="preview"
                                      style={{ maxWidth: 120, marginTop: 8 }}
                                    />
                                  ) : typeof values[field.name] === "object" &&
                                    values[field.name].url ? (
                                    <img
                                      src={values[field.name].url}
                                      alt="preview"
                                      style={{ maxWidth: 120, marginTop: 8 }}
                                    />
                                  ) : null)}
                              </div>
                            )}
                            {field.type === "file" && (
                              <div style={{ textAlign: "center" }}>
                                <input
                                  type="file"
                                  className="form-control"
                                  onChange={(e) => {
                                    const file =
                                      e.target.files && e.target.files[0];
                                    if (file) handleChange(field.name, file);
                                  }}
                                />
                                {values[field.name] &&
                                  (typeof values[field.name] === "object" &&
                                  values[field.name].url &&
                                  values[field.name].name ? (
                                    <a
                                      href={values[field.name].url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ display: "block", marginTop: 8 }}
                                    >
                                      {values[field.name].name}
                                    </a>
                                  ) : typeof values[field.name] === "string" ? (
                                    <a
                                      href={values[field.name]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ display: "block", marginTop: 8 }}
                                    >
                                      {(() => {
                                        try {
                                          const url = values[field.name];
                                          const parts = url.split("/");
                                          let fileName =
                                            parts[parts.length - 1];
                                          fileName = fileName.split("?")[0];
                                          return decodeURIComponent(fileName);
                                        } catch {
                                          return "Arquivo";
                                        }
                                      })()}
                                    </a>
                                  ) : null)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))}
            <button
              type="submit"
              className="btn btn-success"
              disabled={submitting}
            >
              Salvar Alterações
            </button>
          </form>
          <button
            type="button"
            className="btn btn-secondary mt-2"
            onClick={() => navigate("/records?formId=" + form.id)}
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditRecordPage;
