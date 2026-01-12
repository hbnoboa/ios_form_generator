import React from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
import { Link } from "react-router-dom";

const AdminDashboard: React.FC = () => {
  return (
    <Container>
      <h2 className="mb-4">Admin Dashboard</h2>
      <Row xs={1} md={2} lg={3} className="g-4">
        <Col>
          <Card bg="dark" text="light">
            <Card.Body>
              <Card.Title>Gerenciar Usuários</Card.Title>
              <Card.Text>Crie novos usuários e defina funções.</Card.Text>
              <Link to="/admin/register" className="btn btn-primary">
                Registrar Usuário
              </Link>
              <span className="ms-2" />
              <Link to="/admin/users" className="btn btn-outline-light ms-2">
                Ver Usuários
              </Link>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card bg="dark" text="light">
            <Card.Body>
              <Card.Title>Logs do Sistema</Card.Title>
              <Card.Text>Veja quem fez o quê e quando.</Card.Text>
              <Link to="/admin/logs" className="btn btn-warning">
                Ver Logs
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboard;
