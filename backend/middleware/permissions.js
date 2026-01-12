// Função utilitária: verifica se há interseção entre arrays
function hasOrgIntersection(userOrg, itemOrgs) {
  if (!Array.isArray(userOrg)) userOrg = [userOrg];
  if (!Array.isArray(itemOrgs)) itemOrgs = [itemOrgs];
  return userOrg.some((org) => itemOrgs.includes(org));
}

function authorize(action, getItemOrgs = null) {
  return async (req, res, next) => {
    const { role, org: userOrg } = req.user || {};
    if (!role) return res.status(403).json({ error: "No role found" });

    // Admin: acesso total
    if (role === "Admin") return next();

    // Manager: acesso limitado à própria org
    if (role === "Manager") {
      if (["view", "create", "edit", "delete"].includes(action)) {
        if (!getItemOrgs)
          return res
            .status(500)
            .json({ error: "Configuração de permissão ausente" });
        const itemOrgs = await getItemOrgs(req);
        if (hasOrgIntersection(userOrg, itemOrgs)) return next();
        // Não exibir mensagem de mismatch; usar 404 para view e 403 genérico para demais
        if (action === "view")
          return res.status(404).json({ error: "Not found" });
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    // Operator: pode ver forms/subforms, CRUD em records/subrecords da sua org
    if (role === "Operator") {
      if (["view", "create", "edit", "delete"].includes(action)) {
        if (!getItemOrgs)
          return res
            .status(500)
            .json({ error: "Configuração de permissão ausente" });
        const itemOrgs = await getItemOrgs(req);
        if (hasOrgIntersection(userOrg, itemOrgs)) return next();
        if (action === "view")
          return res.status(404).json({ error: "Not found" });
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    // User: só pode ver itens da sua org
    if (role === "User") {
      if (action === "view") {
        if (!getItemOrgs)
          return res
            .status(500)
            .json({ error: "Configuração de permissão ausente" });
        const itemOrgs = await getItemOrgs(req);
        if (hasOrgIntersection(userOrg, itemOrgs)) return next();
        return res.status(404).json({ error: "Not found" });
      }
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.status(403).json({ error: "Forbidden" });
  };
}

module.exports = { authorize };
