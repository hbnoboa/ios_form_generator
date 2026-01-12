import React, { useEffect, useState } from "react";
import { Container, Table, Alert, Form, Row, Col } from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../../contexts/authContext";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  org: string | string[];
}

const AdminUsersPage: React.FC = () => {
  const { user, claims } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setError(null);
    try {
      const token = await user?.getIdToken();
      const res = await axios.get(`/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: UserRow[] = res.data?.data || [];
      setRows(data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Erro ao carregar usuários";
      setError(msg);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    const orgDisplay = Array.isArray(r.org) ? r.org.join(", ") : r.org || "";
    return (
      (r.name || "").toLowerCase().includes(q) ||
      (r.email || "").toLowerCase().includes(q) ||
      (r.role || "").toLowerCase().includes(q) ||
      orgDisplay.toLowerCase().includes(q)
    );
  });

  return (
    <Container fluid>
      <h2 className="mb-3">Usuários</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form className="mb-3">
        <Row className="g-2">
          <Col xs={12} md={6} lg={4}>
            <Form.Control
              placeholder="Pesquisar por nome, email, role ou org..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Col>
          <Col xs={12} md="auto">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchUsers}
            >
              Atualizar
            </button>
          </Col>
        </Row>
      </Form>
      <Table striped bordered hover variant="dark" size="sm">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Role</th>
            <th>Org</th>
            {claims?.role === "Admin" && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => {
            const orgDisplay = Array.isArray(u.org)
              ? u.org.join(", ")
              : u.org || "";
            return (
              <tr key={u.id}>
                <td>{u.name || "-"}</td>
                <td>{u.email || "-"}</td>
                <td>{u.role || "-"}</td>
                <td>{orgDisplay}</td>
                {claims?.role === "Admin" && (
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={deletingId === u.id}
                      onClick={async () => {
                        if (!window.confirm(`Deletar usuário ${u.email}?`))
                          return;
                        setError(null);
                        setDeletingId(u.id);
                        try {
                          const token = await user?.getIdToken();
                          await axios.delete(`/api/users/${u.id}`, {
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          setRows((prev) => prev.filter((r) => r.id !== u.id));
                        } catch (err: any) {
                          const msg =
                            err?.response?.data?.error ||
                            err?.message ||
                            "Erro ao deletar usuário";
                          setError(msg);
                        } finally {
                          setDeletingId(null);
                        }
                      }}
                    >
                      {deletingId === u.id ? "Deletando..." : "Deletar"}
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Container>
  );
};

export default AdminUsersPage;
