import React, { createContext, useContext } from "react";
import { useAuth } from "./authContext";

interface PermissionsContextType {
  canViewForms: boolean;
  canEditForms: boolean;
  canDeleteForms: boolean;
  canCreateForms: boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({
  canViewForms: false,
  canEditForms: false,
  canDeleteForms: false,
  canCreateForms: false,
});

export const usePermissions = () => useContext(PermissionsContext);

export const PermissionsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { claims } = useAuth();
  const role = claims?.role;

  const canViewForms = ["Admin", "Manager", "Operator", "User"].includes(role);
  const canEditForms = ["Admin", "Manager"].includes(role);
  const canDeleteForms = ["Admin", "Manager"].includes(role);
  const canCreateForms = ["Admin", "Manager"].includes(role);

  return (
    <PermissionsContext.Provider
      value={{
        canViewForms,
        canEditForms,
        canDeleteForms,
        canCreateForms,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};
