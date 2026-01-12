import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { usePermissions } from "../contexts/permissionsContext";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { canViewForms } = usePermissions();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  useEffect(() => {
    if (canViewForms) {
      navigate("/forms", { replace: true });
    }
  }, [canViewForms, navigate]);

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "auto",
        marginTop: 100,
        textAlign: "center",
      }}
    >
      <h2>Bem-vindo ao sistema!</h2>
      <button onClick={handleLogout} style={{ marginTop: 24 }}>
        Sair
      </button>
    </div>
  );
};

export default Home;
