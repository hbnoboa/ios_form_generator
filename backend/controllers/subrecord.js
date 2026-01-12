// Paginação de subregistros (10 por página)
exports.getSubrecordsPaginated = async (req, res) => {
  try {
    const { role, org: userOrg } = req.user || {};
    const page = parseInt(req.params.page, 10) || 1;
    const pageSize = 10;
    let all = [];
    if (role === "Admin") {
      const snap = await db
        .collection("subrecords")
        .orderBy("createdAt", "desc")
        .get();
      all = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      const orgsRaw = Array.isArray(userOrg) ? userOrg : [userOrg];
      const orgs = orgsRaw.filter((o) => o != null && o !== "");
      if (orgs.length > 0) {
        const coll = db.collection("subrecords");
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

// Criar subregistro
exports.createSubrecord = async (req, res) => {
  try {
    const doc = await db.collection("subrecords").add(req.body);
    await logAction(req, {
      action: "create",
      resourceType: "subrecords",
      resourceId: doc.id,
    });
    res.status(201).json({ id: doc.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Listar subregistros (filtra por org do usuário, se não for Admin)
exports.getSubrecords = async (req, res) => {
  try {
    const { role, org: userOrg } = req.user || {};
    let data = [];
    if (role === "Admin") {
      const snap = await db.collection("subrecords").get();
      data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      const orgsRaw = Array.isArray(userOrg) ? userOrg : [userOrg];
      const orgs = orgsRaw.filter((o) => o != null && o !== "");
      if (orgs.length === 0) {
        data = [];
      } else {
        const coll = db.collection("subrecords");
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
        data = Array.from(results.values());
      }
    }
    await logAction(req, {
      action: "view_list",
      resourceType: "subrecords",
      metadata: { count: data.length },
    });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Buscar subregistro por ID
exports.getSubrecord = async (req, res) => {
  try {
    const doc = await db.collection("subrecords").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    await logAction(req, {
      action: "view",
      resourceType: "subrecords",
      resourceId: req.params.id,
    });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Atualizar subregistro
exports.updateSubrecord = async (req, res) => {
  try {
    await db.collection("subrecords").doc(req.params.id).update(req.body);
    await logAction(req, {
      action: "edit",
      resourceType: "subrecords",
      resourceId: req.params.id,
    });
    res.json({ status: "updated" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Deletar subregistro
exports.deleteSubrecord = async (req, res) => {
  try {
    await db.collection("subrecords").doc(req.params.id).delete();
    await logAction(req, {
      action: "delete",
      resourceType: "subrecords",
      resourceId: req.params.id,
    });
    res.json({ status: "deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
