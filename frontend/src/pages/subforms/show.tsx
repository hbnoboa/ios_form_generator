import React, { useEffect, useState } from "react";
import MapField from "../../components/fields/MapField";
import HotspotImageField from "../../components/fields/HotspotImageField";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";

const ShowSubformPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, claims } = useAuth();
  const [subform, setSubform] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    setLoading(true);
    user.getIdToken().then((token: string) => {
      fetch(`/api/subforms/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("Erro ao buscar subform");
          return res.json();
        })
        .then((data) => {
          setSubform(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    });
  }, [id, user]);

  const role = (claims?.role as string) || "";
  const isManagerOrAdmin = role === "Admin" || role === "Manager";
  if (!isManagerOrAdmin) return <Navigate to="/subforms" replace />;
  if (loading) return <div className="container mt-4">Carregando...</div>;
  if (error) return <div className="container mt-4 text-danger">{error}</div>;
  if (!subform) return null;

  // Agrupar campos por linha (row)
  const fieldsByRow: Record<number, any[]> = {};
  (subform.fields || []).forEach((field: any) => {
    if (!fieldsByRow[field.row]) fieldsByRow[field.row] = [];
    fieldsByRow[field.row].push(field);
  });

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-body">
          <h2>{subform.name}</h2>
          <div className="mb-2">Criado por: {subform.createdBy}</div>
          <div className="mb-2">
            Criado em:{" "}
            {subform.createdAt &&
              new Date(
                subform.createdAt._seconds
                  ? subform.createdAt._seconds * 1000
                  : subform.createdAt
              ).toLocaleString("pt-BR")}
          </div>
          <div className="mb-3">{subform.desc}</div>
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
                          {/* Field rendering */}
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
                                  field.value?.imageUrl || "/placeholder.jpg"
                                }
                                alt="Imagem de capa"
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

export default ShowSubformPage;
