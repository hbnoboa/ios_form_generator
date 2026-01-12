const admin = require("firebase-admin");
const db = admin.firestore();
const { logAction } = require("../utils/audit");

// Cria usuário no Auth, define custom claims e salva perfil no Firestore
async function createUserWithClaims(req, res) {
  const { email, password, name, role, org } = req.body;
  if (!email || !password || !name || !role || !org) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    // 1. Cria usuário no Auth
    const userRecord = await admin
      .auth()
      .createUser({ email, password, displayName: name });
    // 2. Define custom claims (role, org)
    await admin.auth().setCustomUserClaims(userRecord.uid, { role, org });
    // 3. Salva perfil no Firestore
    await db
      .collection("users")
      .doc(userRecord.uid)
      .set({ name, email, role, org });
    res.status(201).json({ uid: userRecord.uid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Lista usuários a partir do Firebase Auth e custom claims
async function listUsers(req, res) {
  try {
    const { role, org: userOrg } = req.user || {};
    if (!role || (role !== "Admin" && role !== "Manager")) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const users = [];
    let result = await admin.auth().listUsers(1000);
    users.push(...result.users);
    while (result.pageToken) {
      result = await admin.auth().listUsers(1000, result.pageToken);
      users.push(...result.users);
    }

    const orgs = Array.isArray(userOrg) ? userOrg : [userOrg];
    const filtered = users.filter((u) => {
      const claims = u.customClaims || {};
      if (role === "Admin") return true;
      const targetOrg = claims.org;
      const arr = Array.isArray(targetOrg) ? targetOrg : [targetOrg];
      return orgs.some((o) => arr.includes(o));
    });

    const data = filtered.map((u) => ({
      id: u.uid,
      name: u.displayName || "",
      email: u.email || "",
      role: (u.customClaims || {}).role || "",
      org: (u.customClaims || {}).org || "",
      disabled: !!u.disabled,
    }));

    res.json({ data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { createUserWithClaims, listUsers };

// Deletar usuário (apenas Admin)
async function deleteUser(req, res) {
  try {
    const { role, email } = req.user || {};
    if (role !== "Admin") return res.status(403).json({ error: "Forbidden" });
    const uid = req.params.id;
    if (!uid) return res.status(400).json({ error: "Missing user id" });

    await admin.auth().deleteUser(uid);
    await logAction(req, {
      action: "delete",
      resourceType: "users",
      resourceId: uid,
      metadata: { initiator: email },
    });
    // Optionally clean Firestore profile if present (non-blocking)
    try {
      await db.collection("users").doc(uid).delete();
    } catch {}
    res.json({ status: "deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports.deleteUser = deleteUser;
