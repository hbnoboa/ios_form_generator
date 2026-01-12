import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  Container,
  Card,
  Row,
  Col,
  Form,
  Button,
  Image,
} from "react-bootstrap";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Entrando...");
    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const token = await userCredential.user.getIdToken();
      console.log("JWT Token:", token);

      const response = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setMessage("Login realizado!");
        navigate("/home", { replace: true });
      } else {
        setMessage("Usuário ou senha inválidos.");
      }
    } catch (err) {
      setMessage("Usuário ou senha inválidos.");
    }
  };

  return (
    <section
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh", backgroundColor: "#181818", color: "#fff" }}
    >
      <Container>
        <Card
          className="bg-dark text-white"
          style={{
            borderRadius: "1rem",
            backgroundColor: "#232323",
            borderColor: "#444",
          }}
        >
          <Card.Body className="p-5">
            <Row className="d-flex justify-content-center align-items-center">
              <Col md={9} lg={6} xl={5} className="mb-4 mb-lg-0 text-center">
                <Image
                  src="/ios-logo.png"
                  alt="ios-logo"
                  fluid
                  style={{ maxHeight: 500 }}
                />
              </Col>
              <Col md={8} lg={6} xl={4} className="offset-xl-1">
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-4" controlId="formEmail">
                    <Form.Label>E-Mail</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      size="lg"
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="formPassword">
                    <Form.Label>Senha</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      size="lg"
                      required
                    />
                  </Form.Group>
                  <div className="d-flex justify-content-between align-items-center mt-4 pt-2">
                    <Button className="btn-orange" size="lg" type="submit">
                      Login
                    </Button>
                  </div>
                  <div className="text-center mt-3">
                    <span
                      style={{
                        color: message === "Login realizado!" ? "green" : "red",
                      }}
                    >
                      {message}
                    </span>
                  </div>
                </Form>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Container>
    </section>
  );
}
