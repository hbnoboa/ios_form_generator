import React, { useMemo, useState } from "react";
import { Container, Form, Button, Alert } from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../../contexts/authContext";
import { useNavigate } from "react-router-dom";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { claims } = useAuth();
  const role = claims?.role as string | undefined;
  const isAdmin = role === "Admin";
  const isManager = role === "Manager";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>("User");
  const [org, setOrg] = useState<string>(claims?.org || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const roleOptions = useMemo(() => {
    if (isAdmin) return ["Admin", "Manager", "Operator", "User"];
    if (isManager) return ["Operator", "User"];
    return [];
  }, [isAdmin, isManager]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const payload = {
        name,
        email,
        password,
        role: newUserRole,
        org: isAdmin ? org : claims?.org,
      };
      await axios.post("/api/users/register", payload);
      navigate("/admin/users", { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error || err?.message || "Erro ao criar usuário";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={{ maxWidth: 640 }}>
      <h2 className="mb-4">Registrar novo usuário</h2>
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-3">
          {success}
        </Alert>
      )}
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="name">
          <Form.Label>Nome</Form.Label>
          <Form.Control
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="email">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="password">
          <Form.Label>Senha</Form.Label>
          <Form.Control
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="role">
          <Form.Label>Função do usuário</Form.Label>
          <Form.Select
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value)}
            required
          >
            {roleOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="org">
          <Form.Label>Organização</Form.Label>
          <Form.Control
            type="text"
            value={isAdmin ? org : claims?.org || ""}
            onChange={(e) => setOrg(e.target.value)}
            required
            disabled={isManager}
            placeholder={isManager ? "Sua organização" : "Digite a organização"}
          />
          {isManager && (
            <Form.Text className="text-muted">
              Managers criam usuários apenas na própria organização.
            </Form.Text>
          )}
        </Form.Group>

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Criando..." : "Criar Usuário"}
        </Button>
      </Form>
    </Container>
  );
};

export default RegisterPage;
