import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import MapField from "../../components/fields/MapField";
import HotspotImageField from "../../components/fields/HotspotImageField";
import { useAuth } from "../../contexts/authContext";

const ShowSubrecordPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subrecord, setSubrecord] = useState<any>(null);
  const [subform, setSubform] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);
    user.getIdToken().then(async (token: string) => {
      try {
        const res = await axios.get(`/api/subrecords/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const sr = res.data;
        setSubrecord(sr);
        if (sr.subform) {
          const sres = await axios.get(`/api/subforms/${sr.subform}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSubform(sres.data);
        }
        setLoading(false);
      } catch (err: any) {
        setError(err.response?.data?.error || "Erro ao buscar subregistro");
        setLoading(false);
      }
    });
  }, [user, id]);

  if (loading) return <div className="container mt-4">Carregando...</div>;
  if (error) return <div className="container mt-4 text-danger">{error}</div>;
  if (!subrecord) return null;

  const data = subrecord.data || {};
  const fields = (subform?.fields || []).map((f: any) => ({
    ...f,
    value: data[f.name]?.value,
  }));

  const fieldsByRow: Record<number, any[]> = {};
  fields.forEach((field: any) => {
    if (!fieldsByRow[field.row]) fieldsByRow[field.row] = [];
    fieldsByRow[field.row].push(field);
  });

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-body">
          <h2>Subregistro</h2>
          <div className="mb-2">Criado por: {subrecord.createdBy}</div>
          <div className="mb-2">
            Criado em:{" "}
            {subrecord.createdAt &&
              new Date(
                subrecord.createdAt._seconds
                  ? subrecord.createdAt._seconds * 1000
                  : subrecord.createdAt
              ).toLocaleString("pt-BR")}
          </div>
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
                    return (
                      <div className={colClass} key={fieldIdx}>
                        <div className="mb-2">
                          <label className="form-label">{field.label}</label>
                          {field.type === "hotspot" && (
                            <div style={{ textAlign: "center" }}>
                              <HotspotImageField
                                imageUrl={
                                  field.value?.imageUrl || "/placeholder.jpg"
                                }
                                hotspots={field.value?.hotspots || []}
                                readOnly={true}
                                width="100%"
                                height={200}
                              />
                            </div>
                          )}
                          {field.type === "array" && (
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Lista"
                              disabled
                              value=""
                            />
                          )}
                          {field.type === "number" && (
                            <input
                              type="number"
                              className="form-control"
                              defaultValue={field.value || ""}
                              disabled
                            />
                          )}
                          {field.type === "text" && (
                            <input
                              type="text"
                              className="form-control"
                              defaultValue={field.value || ""}
                              disabled
                            />
                          )}
                          {field.type === "area" && (
                            <textarea
                              className="form-control"
                              rows={3}
                              defaultValue={field.value || ""}
                              disabled
                            />
                          )}
                          {field.type === "select" && (
                            <select
                              className="form-select"
                              value={field.value || ""}
                              onChange={() => {}}
                            >
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
                              type="date"
                              className="form-control"
                              defaultValue={field.value || ""}
                              disabled
                            />
                          )}
                          {field.type === "check" && (
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={!!field.value}
                                disabled
                                style={{ pointerEvents: "none" }}
                              />
                            </div>
                          )}
                          {field.type === "map" &&
                            (() => {
                              const val = field.value;
                              let lat = val?.lat;
                              let lng = val?.lng;
                              let isValid =
                                typeof lat === "number" &&
                                typeof lng === "number" &&
                                !isNaN(lat) &&
                                !isNaN(lng);
                              if (!isValid) {
                                lat = -23.55052;
                                lng = -46.633308;
                              }
                              return (
                                <MapField
                                  initialValue={{ lat, lng }}
                                  readOnly={true}
                                  height={180}
                                  width="100%"
                                />
                              );
                            })()}
                          {field.type === "image" && (
                            <div style={{ textAlign: "center" }}>
                              <img
                                src={
                                  typeof field.value === "object"
                                    ? field.value?.url ||
                                      field.value?.imageUrl ||
                                      "/placeholder.jpg"
                                    : field.value || "/placeholder.jpg"
                                }
                                alt="Imagem"
                                style={{
                                  width: "100%",
                                  maxHeight: 180,
                                  borderRadius: 8,
                                  border: "1px solid #ccc",
                                  objectFit: "cover",
                                  background: "#f8f9fa",
                                  opacity: 0.6,
                                }}
                              />
                            </div>
                          )}
                          {field.type === "file" && (
                            <div style={{ textAlign: "center" }}>
                              <input
                                type="file"
                                className="form-control"
                                style={{ margin: "0 auto" }}
                                disabled
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
        </div>
      </div>
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

export default ShowSubrecordPage;
