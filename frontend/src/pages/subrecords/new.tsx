import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import axios from "axios";
import MapField from "../../components/fields/MapField";
import HotspotImageField from "../../components/fields/HotspotImageField";
import { askDone } from "../../components/fields/DoneField";
import { storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../contexts/authContext";

const NewSubrecordPage: React.FC = () => {
  const { user, claims } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [subform, setSubform] = useState<any>(null);
  const [values, setValues] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const recordId = searchParams.get("recordId");
  const subformId = searchParams.get("subformId");

  useEffect(() => {
    if (!user || !subformId) return;
    setLoading(true);
    user.getIdToken().then(async (token: string) => {
      try {
        // Busca o subform
        const res = await axios.get(`/api/subforms/${subformId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSubform(res.data);
        setLoading(false);
      } catch (err: any) {
        setError(err.response?.data?.error || "Erro ao buscar subform");
        setLoading(false);
      }
    });
  }, [user, subformId]);

  const role = (claims?.role as string) || "";
  const isNotUser = role !== "User";
  if (!isNotUser) return <Navigate to="/subrecords" replace />;

  const handleChange = (name: string, value: any) => {
    setValues((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subform || !recordId || !subformId) return;
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const hasDone = Array.isArray(subform.fields)
        ? subform.fields.some((f: any) => f.type === "done")
        : false;
      const finalizar = hasDone ? await askDone() : false;
      const dataToSend: Record<string, any> = {};
      for (const field of subform.fields) {
        let value = values[field.name];
        if (field.type === "done") {
          value = finalizar === true;
        }
        if (
          (field.type === "image" || field.type === "file") &&
          values[field.name] instanceof File
        ) {
          const file = values[field.name];
          const storageRef = ref(
            storage,
            `subrecords/${subform.id || subformId}/${
              field.name
            }_${Date.now()}_${file.name}`
          );
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          value = { url, name: file.name };
        }
        dataToSend[field.name] = { value, type: field.type };
      }
      const payload = {
        data: dataToSend,
        record: recordId,
        subform: subformId,
        createdBy: user.email,
        org: subform?.org,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await axios.post(`/api/subrecords`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Após criar o subrecord, atualiza o contador no record
      try {
        const srListRes = await axios.get(`/api/subrecords`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        let srList: any[] = Array.isArray(srListRes.data)
          ? srListRes.data
          : srListRes.data?.data || [];
        const countForPair = srList.filter(
          (r) => r.record === recordId && r.subform === subformId
        ).length;
        const recRes = await axios.get(`/api/records/${recordId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const currentRecord = recRes.data || {};
        const keyName = subform?.name || subformId;
        const newRecordData = {
          ...(currentRecord.recordData || {}),
          [keyName]: { value: countForPair, type: "number" },
        };
        await axios.put(
          `/api/records/${recordId}`,
          { recordData: newRecordData, updatedAt: new Date().toISOString() },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (e) {
        // Silently ignore counter update errors to not block creation UX
      }
      navigate(`/subrecords?recordId=${recordId}&subformId=${subformId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao criar subregistro");
    }
    setSubmitting(false);
  };

  if (loading) return <div className="container mt-4">Carregando...</div>;
  if (error) return <div className="container mt-4 text-danger">{error}</div>;
  if (!subform) return null;

  const fieldsByRow: Record<number, any[]> = {};
  (subform.fields || []).forEach((field: any) => {
    if (!fieldsByRow[field.row]) fieldsByRow[field.row] = [];
    fieldsByRow[field.row].push(field);
  });

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-body">
          <h2>Novo Subregistro: {subform.name}</h2>
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
                                    ).flatMap((hotspot: any, idx: number) =>
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
                            {field.type === "date" && (
                              <input
                                type="datetime-local"
                                className="form-control"
                                value={values[field.name] ?? ""}
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
              Salvar Subregistro
            </button>
          </form>
          <button
            type="button"
            className="btn btn-secondary mt-2"
            onClick={() =>
              navigate(
                `/subrecords?recordId=${recordId}&subformId=${subformId}`
              )
            }
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewSubrecordPage;
