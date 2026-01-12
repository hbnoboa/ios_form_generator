import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import MapField from "../../components/fields/MapField";
import SubformsIndex from "../subforms";
import { useAuth } from "../../contexts/authContext";

const ShowRecordPage: React.FC = () => {
  const { user } = useAuth();
  const { id: recordId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState<any>(null);
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setRecord(recordRes.data);
        // 2. Busca o form
        const formRes = await axios.get(`/api/forms/${recordRes.data.formId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setForm(formRes.data);
        setLoading(false);
      } catch (err: any) {
        setError(
          err.response?.data?.error || "Erro ao buscar registro/formulário"
        );
        setLoading(false);
      }
    });
  }, [user, effectiveRecordId]);

  if (loading) return <div className="container mt-4">Carregando...</div>;
  if (error) return <div className="container mt-4 text-danger">{error}</div>;
  if (!form || !record) return null;

  // Agrupar campos por linha (row)
  const fieldsByRow: Record<number, any[]> = {};
  (form.fields || []).forEach((field: any) => {
    if (!fieldsByRow[field.row]) fieldsByRow[field.row] = [];
    fieldsByRow[field.row].push(field);
  });
  // Extrai o valor real de cada campo (record.recordData agora é { type, value })
  const values: Record<string, any> = {};
  if (record.recordData) {
    Object.keys(record.recordData).forEach((key) => {
      const fieldObj = record.recordData[key];
      values[key] =
        fieldObj && typeof fieldObj === "object" && "value" in fieldObj
          ? fieldObj.value
          : fieldObj;
    });
  }

  // Formatters for PT-BR number and currency display
  const nfNumber = new Intl.NumberFormat("pt-BR");
  const nfMoney = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const displayNumber = (v: any): string => {
    if (v === null || v === undefined || v === "") return "";
    const n =
      typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? "" : nfNumber.format(n);
  };
  const displayMoney = (v: any): string => {
    if (v === null || v === undefined || v === "") return "";
    const n =
      typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? "" : nfMoney.format(n);
  };

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-body">
          <h2>Visualizar Registro: {form.name}</h2>
          {Object.keys(fieldsByRow)
            .sort((a, b) => Number(a) - Number(b))
            .map((rowIdx) => (
              <div className="row mb-3" key={rowIdx}>
                {fieldsByRow[Number(rowIdx)]
                  .sort((a, b) => a.col - b.col)
                  .map((field: any, fieldIdx: number) => {
                    const colClass =
                      fieldsByRow[Number(rowIdx)].length === 4
                        ? "col-3"
                        : fieldsByRow[Number(rowIdx)].length === 3
                        ? "col-4"
                        : fieldsByRow[Number(rowIdx)].length === 2
                        ? "col-6"
                        : "col-12";
                    const value = values[field.name];
                    return (
                      <div className={colClass} key={fieldIdx}>
                        <div className="mb-2">
                          <label className="form-label fw-bold">
                            {field.label}
                          </label>
                          <div>
                            {field.type === "hotspot" && (
                              <input
                                className="form-control"
                                value={value || "(não selecionado)"}
                                readOnly
                                disabled
                              />
                            )}
                            {field.type === "array" && Array.isArray(value) && (
                              <ul
                                className="list-group mb-0"
                                style={{
                                  background: "transparent",
                                  borderRadius: ".375rem",
                                }}
                              >
                                {value.length === 0 && (
                                  <li
                                    className="list-group-item text-muted bg-transparent"
                                    style={{
                                      color: "#6c757d",
                                      border: "1px solid #dee2e6",
                                      borderRadius: ".375rem",
                                    }}
                                  >
                                    (vazio)
                                  </li>
                                )}
                                {value.map((item: any, idx: number) => (
                                  <li
                                    className="list-group-item bg-transparent"
                                    key={idx}
                                    style={{
                                      border: "1px solid #dee2e6",
                                      color: "#ffffff",
                                      borderRadius: ".375rem",
                                      marginBottom: 4,
                                    }}
                                  >
                                    <span
                                      style={{
                                        marginRight: 8,
                                        fontWeight: "bold",
                                      }}
                                    >
                                      •
                                    </span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {field.type === "text" && (
                              <input
                                type="text"
                                className="form-control"
                                value={value ?? ""}
                                readOnly
                                disabled
                              />
                            )}
                            {field.type === "area" && (
                              <textarea
                                className="form-control"
                                value={value ?? ""}
                                readOnly
                                disabled
                                rows={Math.max(
                                  2,
                                  (value || "").split("\n").length
                                )}
                              />
                            )}
                            {field.type === "number" && (
                              <input
                                type="text"
                                className="form-control"
                                value={displayNumber(value)}
                                readOnly
                                disabled
                              />
                            )}
                            {field.type === "money" && (
                              <input
                                type="text"
                                className="form-control"
                                value={displayMoney(value)}
                                readOnly
                                disabled
                              />
                            )}
                            {field.type === "file" &&
                              value &&
                              (() => {
                                let url = "";
                                let fileName = "Arquivo";
                                if (typeof value === "object" && value.url) {
                                  url = value.url;
                                  fileName =
                                    value.name ||
                                    (() => {
                                      try {
                                        const parts = url.split("/");
                                        let name = parts[parts.length - 1];
                                        name = name.split("?")[0];
                                        return decodeURIComponent(name);
                                      } catch {
                                        return "Arquivo";
                                      }
                                    })();
                                } else if (typeof value === "string") {
                                  url = value;
                                  try {
                                    const parts = url.split("/");
                                    fileName = parts[parts.length - 1];
                                    fileName = fileName.split("?")[0];
                                    fileName = decodeURIComponent(fileName);
                                  } catch {
                                    fileName = "Arquivo";
                                  }
                                }
                                if (!url) return null;
                                return (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="form-control"
                                    style={{
                                      cursor: "pointer",
                                      padding: "0.375rem 0.75rem",
                                      display: "block",
                                      color: "#0d6efd",
                                      textDecoration: "underline",
                                      background: "#f8f9fa",
                                      border: "1px solid #ced4da",
                                      borderRadius: ".375rem",
                                    }}
                                  >
                                    {fileName}
                                  </a>
                                );
                              })()}
                            {(field.type === "select" ||
                              field.type === "form-data-select") && (
                              <input
                                type="text"
                                className="form-control"
                                value={value ?? ""}
                                readOnly
                                disabled
                              />
                            )}
                            {field.type === "date" && (
                              <input
                                type="text"
                                className="form-control"
                                value={(() => {
                                  const v = value;
                                  if (!v) return "";
                                  const d = new Date(v);
                                  if (isNaN(d.getTime())) return v;
                                  const pad = (n: number) =>
                                    n.toString().padStart(2, "0");
                                  return (
                                    pad(d.getDate()) +
                                    "/" +
                                    pad(d.getMonth() + 1) +
                                    "/" +
                                    d.getFullYear() +
                                    " " +
                                    pad(d.getHours()) +
                                    ":" +
                                    pad(d.getMinutes())
                                  );
                                })()}
                                readOnly
                                disabled
                              />
                            )}
                            {field.type === "check" && (
                              <input
                                type="text"
                                className="form-control"
                                value={value ? "Sim" : "Não"}
                                readOnly
                                disabled
                              />
                            )}
                            {field.type === "map" &&
                              value &&
                              value.lat != null &&
                              value.lng != null && (
                                <MapField
                                  initialValue={value}
                                  readOnly={true}
                                  height={180}
                                  width="100%"
                                />
                              )}
                            {field.type === "image" &&
                              value &&
                              (typeof value === "object" && value.url ? (
                                <img
                                  src={value.url}
                                  alt="imagem"
                                  style={{ maxWidth: 120, marginTop: 8 }}
                                />
                              ) : typeof value === "string" ? (
                                <img
                                  src={value}
                                  alt="imagem"
                                  style={{ maxWidth: 120, marginTop: 8 }}
                                />
                              ) : null)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
          <button
            className="btn btn-secondary mt-2"
            onClick={() => navigate(-1)}
          >
            Voltar
          </button>
          <div className="mt-4">
            <SubformsIndex formId={record.formId} recordId={record.id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowRecordPage;
