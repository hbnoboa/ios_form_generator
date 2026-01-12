import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import Login from "./pages/auth/login";
import Home from "./pages/home";
import FormsPage from "./pages/forms";
import NewFormPage from "./pages/forms/new";
import ShowFormPage from "./pages/forms/show";
import EditFormPage from "./pages/forms/edit";
import RecordsPage from "./pages/records";
import NewRecordsPage from "./pages/records/new";
import EditRecordPage from "./pages/records/edit";
import ShowRecordPage from "./pages/records/show";
import SubrecordsPage from "./pages/subrecords";
import NewSubrecordPage from "./pages/subrecords/new";
import ShowSubrecordPage from "./pages/subrecords/show";
import EditSubrecordPage from "./pages/subrecords/edit";
import SubformsIndex from "./pages/subforms";
import NewSubformPage from "./pages/subforms/new";
import ShowSubformPage from "./pages/subforms/show";
import EditSubformPage from "./pages/subforms/edit";
import Navbar from "./components/Navbar";
import { useAuth } from "./contexts/authContext";
import RegisterPage from "./pages/admin/register";
import AdminDashboard from "./pages/admin";
import AdminLogsPage from "./pages/admin/logs";
import AdminUsersPage from "./pages/admin/users";
import UserPage from "./pages/auth/user";
import {
  PermissionsProvider,
  usePermissions,
} from "./contexts/permissionsContext";

// Rota protegida: só acessa se estiver logado
function PrivateRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div>Carregando...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

// Rota protegida por permissão
function FormsProtectedRoute() {
  const { canViewForms } = usePermissions();
  if (!canViewForms) return <Navigate to="/" replace />;
  return <FormsPage />;
}

// Rota protegida por role (Admin/Manager)
function AdminProtectedRoute() {
  const { claims } = useAuth();
  const role = claims?.role;
  const isAllowed = role === "Admin" || role === "Manager";
  if (!isAllowed) return <Navigate to="/" replace />;
  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <PermissionsProvider>
              <PrivateRoute />
            </PermissionsProvider>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/forms" element={<FormsProtectedRoute />} />
          <Route path="/forms/new" element={<NewFormPage />} />
          <Route path="/forms/:id" element={<ShowFormPage />} />
          <Route path="/forms/:id/edit" element={<EditFormPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/records/new" element={<NewRecordsPage />} />
          <Route path="/records/:id" element={<ShowRecordPage />} />
          <Route path="/records/:id/edit" element={<EditRecordPage />} />
          <Route path="/subforms" element={<SubformsIndex />} />
          <Route path="/subforms/new" element={<NewSubformPage />} />
          <Route path="/subforms/:id" element={<ShowSubformPage />} />
          <Route path="/subforms/:id/edit" element={<EditSubformPage />} />
          <Route path="/subrecords" element={<SubrecordsPage />} />
          <Route path="/subrecords/new" element={<NewSubrecordPage />} />
          <Route path="/subrecords/:id" element={<ShowSubrecordPage />} />
          <Route path="/subrecords/:id/edit" element={<EditSubrecordPage />} />
          <Route path="/user" element={<UserPage />} />
          <Route path="/admin" element={<AdminProtectedRoute />}>
            <Route index element={<AdminDashboard />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="logs" element={<AdminLogsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
