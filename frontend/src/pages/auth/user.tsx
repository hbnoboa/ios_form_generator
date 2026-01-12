import React, { useState } from "react";
import { useAuth } from "../../contexts/authContext";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../../firebase";

const UserPage: React.FC = () => {
  const { user, claims } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return <div className="container mt-4">Carregando usuário...</div>;
  }

  const providerIds = (user.providerData || []).map((p) => p.providerId);
  const isPasswordProvider = providerIds.includes("password");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!isPasswordProvider) {
      setError(
        "Sua conta não usa senha tradicional. Use 'Enviar e-mail de redefinição'."
      );
      return;
    }
    if (!user.email) {
      setError("Usuário sem e-mail válido.");
      return;
    }
    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("A confirmação não corresponde à nova senha.");
      return;
    }
    setLoading(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      setMessage("Senha alterada com sucesso.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const code = err?.code || "unknown";
      let msg = "Falha ao alterar senha.";
      if (code === "auth/wrong-password") msg = "Senha atual incorreta.";
      else if (code === "auth/too-many-requests")
        msg = "Muitas tentativas. Tente mais tarde.";
      else if (code === "auth/weak-password")
        msg = "A nova senha é muito fraca.";
      else if (code === "auth/requires-recent-login")
        msg = "Faça login novamente para alterar a senha.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetEmail = async () => {
    setMessage(null);
    setError(null);
    if (!user.email) {
      setError("Usuário sem e-mail válido.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setMessage("E-mail de redefinição enviado.");
    } catch (err: any) {
      const code = err?.code || "unknown";
      let msg = "Falha ao enviar e-mail de redefinição.";
      if (code === "auth/invalid-email") msg = "E-mail inválido.";
      else if (code === "auth/user-not-found") msg = "Usuário não encontrado.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const orgValue = claims?.org;
  const orgDisplay = Array.isArray(orgValue)
    ? orgValue.join(", ")
    : typeof orgValue === "string"
    ? orgValue
    : "";

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-body">
          <h2>Dados do Usuário</h2>
          <div className="row mb-3">
            <div className="col-md-6">
              <div className="mb-2">
                <label className="form-label">E-mail</label>
                <input
                  className="form-control"
                  value={user.email || ""}
                  readOnly
                />
              </div>
              <div className="mb-2">
                <label className="form-label">Role</label>
                <input
                  className="form-control"
                  value={claims?.role || ""}
                  readOnly
                />
              </div>
              <div className="mb-2">
                <label className="form-label">Org(s)</label>
                <input className="form-control" value={orgDisplay} readOnly />
              </div>
            </div>
          </div>

          <hr />
          <h4>Alterar Senha</h4>
          {!isPasswordProvider && (
            <div className="alert alert-info">
              Sua conta usa um provedor externo (por exemplo, Google). Para
              alterar a senha, utilize o botão de e-mail de redefinição.
            </div>
          )}
          <form onSubmit={handleChangePassword} className="mb-3">
            <div className="row">
              <div className="col-md-4">
                <label className="form-label">Senha atual</label>
                <input
                  type="password"
                  className="form-control"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={!isPasswordProvider || loading}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Nova senha</label>
                <input
                  type="password"
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Confirmar nova senha</label>
                <input
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary mt-3"
              disabled={loading}
            >
              Alterar senha
            </button>
            <button
              type="button"
              className="btn btn-secondary mt-3 ms-2"
              onClick={handleResetEmail}
              disabled={loading}
            >
              Enviar e-mail de redefinição
            </button>
          </form>

          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-danger">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default UserPage;
