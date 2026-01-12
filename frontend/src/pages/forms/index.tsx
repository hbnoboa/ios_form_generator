import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../contexts/authContext";
import { Link, useNavigate } from "react-router-dom";
import { usePermissions } from "../../contexts/permissionsContext";

interface FormType {
  id: string;
  name: string;
  org: string[];
  [key: string]: any;
}

const FormsPage: React.FC = () => {
  const { user, claims } = useAuth();
  const navigate = useNavigate();
  const { canCreateForms, canEditForms, canDeleteForms, canViewForms } =
    usePermissions();
  const [forms, setForms] = useState<FormType[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  // Apenas listagem, sem criação

  const role = claims?.role as string | undefined;
  const isManagerOrAdmin = role === "Admin" || role === "Manager";

  // Buscar formulários (só quando user estiver pronto)
  const fetchForms = async (page = 1) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await axios.get(`/api/forms/page/${page}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let data = res.data.data;
      // Ordenação local
      if (sortField) {
        data = [...data].sort((a, b) => {
          let aValue = a[sortField];
          let bValue = b[sortField];
          // Para arrays (como org), compara como string
          if (Array.isArray(aValue)) aValue = aValue.join(", ");
          if (Array.isArray(bValue)) bValue = bValue.join(", ");
          if (aValue === undefined) return 1;
          if (bValue === undefined) return -1;
          if (aValue === bValue) return 0;
          if (sortOrder === "asc") {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });
      }
      setForms(data);
      setTotalPages(res.data.totalPages);
      setTotalItems(res.data.total);
      setCurrentPage(res.data.page);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao buscar formulários");
    }
    setLoading(false);
  };

  // Buscar formulários ao carregar ou quando o usuário mudar
  useEffect(() => {
    fetchForms(currentPage);
    // eslint-disable-next-line
  }, [user, currentPage, sortField, sortOrder]);
  // Handler para clicar no header
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Removido criação e edição. Adicionando deleção

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!window.confirm("Tem certeza que deseja excluir este formulário?"))
      return;
    try {
      const token = await user.getIdToken();
      await axios.delete(`/api/forms/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setForms((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao excluir formulário");
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Formulários</h2>
        {canCreateForms && (
          <Link to="/forms/new" className="btn btn-success">
            Novo Formulário
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
          input::placeholder {
            color: #fff !important;
            opacity: 1;
          }
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
              {forms
                .filter((form) =>
                  form.name.toLowerCase().includes(search.toLowerCase())
                )
                .map((form) => (
                  <tr key={form.id}>
                    <td>{form.name}</td>
                    <td>
                      {Array.isArray(form.org) ? form.org.join(", ") : form.org}
                    </td>
                    <td>
                      {isManagerOrAdmin && (
                        <Link
                          to={`/forms/${form.id}`}
                          className="btn btn-primary btn-sm me-2"
                        >
                          Visualizar
                        </Link>
                      )}
                      {canViewForms && (
                        <Link
                          to={`/records?formId=${form.id}`}
                          className="btn btn-primary btn-sm me-2"
                        >
                          Lista de Registros
                        </Link>
                      )}
                      {canEditForms && (
                        <Link
                          to={`/forms/${form.id}/edit`}
                          className="btn btn-warning btn-sm me-2"
                        >
                          Editar
                        </Link>
                      )}
                      {canDeleteForms && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(form.id)}
                        >
                          Excluir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {/* Paginação e info */}
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
              Formulários: {totalItems}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary mt-2"
            onClick={() => navigate(-1)}
          >
            Voltar
          </button>
        </>
      )}
    </div>
  );
};

export default FormsPage;
