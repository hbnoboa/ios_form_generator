import React, { useEffect, useState } from "react";
import { Container, Table, Alert, Form, Row, Col } from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../../contexts/authContext";

interface AuditEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  actor?: {
    uid?: string;
    email?: string;
    role?: string;
    org?: string | string[];
  };
  method?: string;
  path?: string;
  ip?: string;
  metadata?: any;
  timestamp: string | Date;
}

const AdminLogsPage: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);

  const fetchLogs = async () => {
    setError(null);
    try {
      const token = await user?.getIdToken();
      const res = await axios.get(`/api/logs?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: AuditEntry[] = res.data?.data || [];
      setLogs(data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error || err?.message || "Erro ao carregar logs";
      setError(msg);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container fluid>
      <h2 className="mb-3">Logs do Sistema</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form className="mb-3">
        <Row className="g-2">
          <Col xs={12} md="auto">
            <Form.Label>Quantidade</Form.Label>
            <Form.Select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
            >
              {[50, 100, 200, 500].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col xs={12} md="auto" className="d-flex align-items-end">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchLogs}
            >
              Atualizar
            </button>
          </Col>
        </Row>
      </Form>
      <Table striped bordered hover variant="dark" size="sm">
        <thead>
          <tr>
            <th>Data</th>
            <th>Ação</th>
            <th>Recurso</th>
            <th>ID</th>
            <th>Usuário</th>
            <th>Role</th>
            <th>Org</th>
            <th>Método</th>
            <th>Path</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => {
            const ts = (l.timestamp as any)?.toDate
              ? (l.timestamp as any).toDate()
              : new Date(l.timestamp);
            const orgDisplay = Array.isArray(l.actor?.org)
              ? l.actor?.org.join(", ")
              : l.actor?.org || "";
            return (
              <tr key={l.id}>
                <td>{ts.toLocaleString()}</td>
                <td>{l.action}</td>
                <td>{l.resourceType}</td>
                <td>{l.resourceId || "-"}</td>
                <td>{l.actor?.email || "-"}</td>
                <td>{l.actor?.role || "-"}</td>
                <td>{orgDisplay}</td>
                <td>{l.method}</td>
                <td>{l.path}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Container>
  );
};

export default AdminLogsPage;
