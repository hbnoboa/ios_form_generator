// Paginação de registros (10 por página)
exports.getRecordsPaginated = async (req, res) => {
  try {
    const { role, org: userOrg } = req.user || {};
    const page = parseInt(req.params.page, 10) || 1;
    const pageSize = 10;
    let all = [];
    if (role === "Admin") {
      const snap = await db
        .collection("records")
        .orderBy("createdAt", "desc")
        .get();
      all = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      const orgsRaw = Array.isArray(userOrg) ? userOrg : [userOrg];
      const orgs = orgsRaw.filter((o) => o != null && o !== "");
      if (orgs.length > 0) {
        const coll = db.collection("records");
        const results = new Map();
        try {
          const snapArr = await coll
            .where("org", "array-contains-any", orgs)
            .get();
          snapArr.docs.forEach((doc) =>
            results.set(doc.id, { id: doc.id, ...doc.data() })
          );
        } catch (_) {}
        for (const o of orgs) {
          try {
            const snapEq = await coll.where("org", "==", o).get();
            snapEq.docs.forEach((doc) =>
              results.set(doc.id, { id: doc.id, ...doc.data() })
            );
          } catch (_) {}
        }
        all = Array.from(results.values());
      }
    }
    const ts = (t) =>
      t && typeof t.toDate === "function"
        ? t.toDate().getTime()
        : t && t.seconds !== undefined
        ? t.seconds * 1000 + Math.floor((t.nanoseconds || 0) / 1e6)
        : new Date(t).getTime();
    all.sort((a, b) => (ts(b.createdAt) || 0) - (ts(a.createdAt) || 0));
    const total = all.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const data = all.slice(start, end);
    res.json({ data, total, totalPages, page });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
const admin = require("firebase-admin");
const db = admin.firestore();
const { logAction } = require("../utils/audit");

// Criar registro
exports.createRecord = async (req, res) => {
  try {
    // Normalize org to array to ensure visibility for non-admin queries
    const orgClaim = req.body.org;
    const normalizedOrg = Array.isArray(orgClaim)
      ? orgClaim
      : orgClaim
      ? [orgClaim]
      : [];
    const payload = { ...req.body, org: normalizedOrg };
    const doc = await db.collection("records").add(payload);
    await logAction(req, {
      action: "create",
      resourceType: "records",
      resourceId: doc.id,
    });
    res.status(201).json({ id: doc.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Listar registros (filtra por org do usuário, se não for Admin)
exports.getRecords = async (req, res) => {
  try {
    const { role, org: userOrg } = req.user || {};
    let data = [];
    if (role === "Admin") {
      const snap = await db.collection("records").get();
      data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      const orgsRaw = Array.isArray(userOrg) ? userOrg : [userOrg];
      const orgs = orgsRaw.filter((o) => o != null && o !== "");
      if (orgs.length === 0) {
        data = [];
      } else {
        const coll = db.collection("records");
        const results = new Map();
        // Records with org stored as array
        try {
          const snapArr = await coll
            .where("org", "array-contains-any", orgs)
            .get();
          snapArr.docs.forEach((doc) =>
            results.set(doc.id, { id: doc.id, ...doc.data() })
          );
        } catch (_) {}
        // Records with org stored as a scalar string
        for (const o of orgs) {
          try {
            const snapEq = await coll.where("org", "==", o).get();
            snapEq.docs.forEach((doc) =>
              results.set(doc.id, { id: doc.id, ...doc.data() })
            );
          } catch (_) {}
        }
        data = Array.from(results.values());
      }
    }
    await logAction(req, {
      action: "view_list",
      resourceType: "records",
      metadata: { count: data.length },
    });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Buscar registro por ID
exports.getRecord = async (req, res) => {
  try {
    const doc = await db.collection("records").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    await logAction(req, {
      action: "view",
      resourceType: "records",
      resourceId: req.params.id,
    });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Atualizar registro
exports.updateRecord = async (req, res) => {
  try {
    await db.collection("records").doc(req.params.id).update(req.body);
    await logAction(req, {
      action: "edit",
      resourceType: "records",
      resourceId: req.params.id,
    });
    res.json({ status: "updated" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Deletar registro
exports.deleteRecord = async (req, res) => {
  try {
    await db.collection("records").doc(req.params.id).delete();
    await logAction(req, {
      action: "delete",
      resourceType: "records",
      resourceId: req.params.id,
    });
    res.json({ status: "deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
