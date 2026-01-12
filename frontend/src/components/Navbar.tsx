import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar, Nav, Container, Dropdown } from "react-bootstrap";

// Ajuste para seu contexto de autenticação
import { useAuth } from "../contexts/authContext";

const AppNavbar: React.FC = () => {
  const { user, claims, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.backgroundColor = "#181818";
    document.body.style.color = "#fff";
    document.body.classList.add("dark-theme");
    return () => {
      document.body.classList.remove("dark-theme");
    };
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4 orange-accent">
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <img
            src="/ios-logo.png"
            alt="IOS Sinistros"
            height={50}
            style={{ display: "block" }}
          />
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navbar-nav" />
        <Navbar.Collapse id="main-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">
              Home
            </Nav.Link>
            <Nav.Link as={Link} to="/forms">
              Formulários
            </Nav.Link>
            {(claims?.role === "Admin" || claims?.role === "Manager") && (
              <Nav.Link as={Link} to="/admin">
                Admin
              </Nav.Link>
            )}
          </Nav>
          <Dropdown align="end">
            <Dropdown.Toggle variant="secondary" id="dropdown-basic">
              {user?.email}
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Item as={Link} to="/user">
                Dados do Usuário
              </Dropdown.Item>
              <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
