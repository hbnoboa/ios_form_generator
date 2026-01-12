import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../contexts/authContext";
import { Link, useLocation, useParams } from "react-router-dom";
import { usePermissions } from "../../contexts/permissionsContext";

interface SubformType {
  id: string;
  name: string;
  org: string[];
  formId?: string;
  [key: string]: any;
}

interface SubformsIndexProps {
  formId?: string;
  recordId?: string;
}

const SubformsIndex: React.FC<SubformsIndexProps> = ({ formId, recordId }) => {
  const { user, claims } = useAuth();
  const { canCreateForms, canEditForms, canDeleteForms } = usePermissions();
  const location = useLocation();
  const { id: formIdFromParams } = useParams();
  // Use formId prop if provided, else read from query string
  const searchParams = new URLSearchParams(location.search);
  const qsFormId = searchParams.get("formId") || undefined;
  const effectiveFormId = formId || formIdFromParams || qsFormId;

  const [subforms, setSubforms] = useState<SubformType[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch subforms; if backend pagination is unknown, fetch all and paginate locally
  const fetchSubforms = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      // Try basic endpoint; adjust if backend supports pagination
      const res = await axios.get(`/api/subforms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let data: SubformType[] = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];
      // Filter by formId when provided
      if (effectiveFormId) {
        data = data.filter((sf) => (sf.form || sf.formId) === effectiveFormId);
      }
      // Sort locally
      if (sortField) {
        data = [...data].sort((a, b) => {
          let aValue = (a as any)[sortField];
          let bValue = (b as any)[sortField];
          if (Array.isArray(aValue)) aValue = aValue.join(", ");
          if (Array.isArray(bValue)) bValue = bValue.join(", ");
          if (aValue === undefined) return 1;
          if (bValue === undefined) return -1;
          if (aValue === bValue) return 0;
          return sortOrder === "asc"
            ? aValue > bValue
              ? 1
              : -1
            : aValue < bValue
            ? 1
            : -1;
        });
      }
      setSubforms(data);
      // count derived from filtered list below
      // Simple local pagination: 10 per page
      const pageSize = 10;
      setTotalPages(Math.max(1, Math.ceil(data.length / pageSize)));
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao buscar subforms");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubforms();
    // eslint-disable-next-line
  }, [user, effectiveFormId, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const pageSize = 10;
  const startIdx = (currentPage - 1) * pageSize;
  const filtered = subforms.filter((sf) =>
    sf.name.toLowerCase().includes(search.toLowerCase())
  );
  const pageItems = filtered.slice(startIdx, startIdx + pageSize);

  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Subforms</h4>
        {canCreateForms && effectiveFormId && (
          <Link
            to={`/subforms/new?formId=${effectiveFormId}`}
            className="btn btn-success"
          >
            Novo Subform
          </Link>
        )}
      </div>
      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320, color: undefined }}
        />
        <style>{`
          input::placeholder { color: #fff !important; opacity: 1; }
        `}</style>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <div>Carregando...</div>
      ) : (
        <>
          <table className="table table-dark table-striped">
            <thead>
              <tr>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("name")}
                >
                  Nome{" "}
                  {sortField === "name" && (
                    <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("org")}
                >
                  Orgs{" "}
                  {sortField === "org" && (
                    <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
                  )}
                </th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((sf) => (
                <tr key={sf.id}>
                  <td>{sf.name}</td>
                  <td>{Array.isArray(sf.org) ? sf.org.join(", ") : sf.org}</td>
                  <td>
                    {(() => {
                      const role = (claims?.role as string) || "";
                      const isManagerOrAdmin =
                        role === "Admin" || role === "Manager";
                      return (
                        isManagerOrAdmin && (
                          <Link
                            to={`/subforms/${sf.id}`}
                            className="btn btn-primary btn-sm me-2"
                          >
                            Visualizar
                          </Link>
                        )
                      );
                    })()}
                    {recordId && (
                      <Link
                        to={`/subrecords?recordId=${recordId}&subformId=${sf.id}`}
                        className="btn 'btn-primary btn-sm me-2"
                      >
                        Sub Registros
                      </Link>
                    )}
                    {canEditForms && (
                      <Link
                        to={`/subforms/${sf.id}/edit`}
                        className="btn btn-warning btn-sm me-2"
                      >
                        Editar
                      </Link>
                    )}
                    {canDeleteForms && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={async () => {
                          if (!user) return;
                          const ok = window.confirm(
                            "Confirmar exclusão do subform?"
                          );
                          if (!ok) return;
                          try {
                            const token = await user.getIdToken();
                            await axios.delete(`/api/subforms/${sf.id}`, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            // Refresh list after delete
                            setSubforms((prev) =>
                              prev.filter((s) => s.id !== sf.id)
                            );
                            // Also remove the subform key from parent form's recordData
                            try {
                              const parentFormId =
                                (sf as any).form ||
                                sf.formId ||
                                effectiveFormId;
                              if (parentFormId && sf.name) {
                                const formRes = await fetch(
                                  `/api/forms/${parentFormId}`,
                                  {
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                    },
                                  }
                                );
                                if (formRes.ok) {
                                  const formJson = await formRes.json();
                                  const rd: Record<string, any> = {
                                    ...(formJson.recordData || {}),
                                  };
                                  delete rd[sf.name];
                                  await fetch(`/api/forms/${parentFormId}`, {
                                    method: "PUT",
                                    headers: {
                                      "Content-Type": "application/json",
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({
                                      recordData: rd,
                                      updatedAt: new Date().toISOString(),
                                    }),
                                  });
                                  // E remove a chave também de todos os records deste formulário
                                  try {
                                    const recRes = await fetch(`/api/records`, {
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                      },
                                    });
                                    if (recRes.ok) {
                                      const recList = await recRes.json();
                                      const related = Array.isArray(recList)
                                        ? recList.filter(
                                            (r: any) =>
                                              r.formId === parentFormId
                                          )
                                        : [];
                                      for (const r of related) {
                                        const rdata: Record<string, any> = {
                                          ...(r.recordData || {}),
                                        };
                                        if (
                                          Object.prototype.hasOwnProperty.call(
                                            rdata,
                                            sf.name
                                          )
                                        ) {
                                          delete rdata[sf.name];
                                          const body = {
                                            recordData: rdata,
                                            updatedAt: new Date().toISOString(),
                                          };
                                          await fetch(`/api/records/${r.id}`, {
                                            method: "PUT",
                                            headers: {
                                              "Content-Type":
                                                "application/json",
                                              Authorization: `Bearer ${token}`,
                                            },
                                            body: JSON.stringify(body),
                                          });
                                        }
                                      }
                                    }
                                  } catch (_) {
                                    // silencioso
                                  }
                                }
                              }
                            } catch (_) {
                              // silencioso
                            }
                          } catch (err: any) {
                            alert(
                              err.response?.data?.error ||
                                "Erro ao excluir subform"
                            );
                          }
                        }}
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="d-flex align-items-center gap-3 mt-3">
            <nav aria-label="Paginação">
              <ul className="pagination pagination-dark mb-0 bg-dark rounded-2 p-1">
                <li
                  className={`page-item${currentPage === 1 ? " disabled" : ""}`}
                >
                  <button
                    className="page-link bg-dark text-light border-secondary"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => (
                  <li
                    key={i + 1}
                    className={`page-item${
                      currentPage === i + 1 ? " active" : ""
                    }`}
                  >
                    <button
                      className={`page-link bg-dark text-light border-secondary${
                        currentPage === i + 1 ? " active" : ""
                      }`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li
                  className={`page-item${
                    currentPage === totalPages ? " disabled" : ""
                  }`}
                >
                  <button
                    className="page-link bg-dark text-light border-secondary"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </button>
                </li>
              </ul>
            </nav>
            <div className="fw-bold ms-2" style={{ minWidth: 120 }}>
              Subforms: {filtered.length}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SubformsIndex;
