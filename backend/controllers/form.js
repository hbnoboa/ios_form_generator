// Paginação de formulários (10 por página)
exports.getFormsPaginated = async (req, res) => {
  try {
    const { role, org: userOrg } = req.user || {};
    const page = parseInt(req.params.page, 10) || 1;
    const pageSize = 10;
    let snap;
    if (role === "Admin") {
      snap = await db.collection("forms").orderBy("createdAt", "desc").get();
    } else {
      const orgs = (Array.isArray(userOrg) ? userOrg : [userOrg]).filter(
        Boolean
      );
      if (orgs.length === 0) {
        return res.json({ data: [], total: 0, totalPages: 0, page });
      }
      const col = db.collection("forms");
      const [arrSnap, inSnap] = await Promise.all([
        col.where("org", "array-contains-any", orgs).get(),
        col.where("org", "in", orgs).get(),
      ]);
      // Merge results into a pseudo-snapshot array
      const mergedDocs = new Map();
      arrSnap.docs.forEach((doc) => mergedDocs.set(doc.id, doc));
      inSnap.docs.forEach((doc) => mergedDocs.set(doc.id, doc));
      snap = { docs: Array.from(mergedDocs.values()) };
    }
    let all = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    // Sort in memory to avoid composite index requirement
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

// Criar formulário
exports.createForm = async (req, res) => {
  try {
    const { name, desc, lines } = req.body;
    const orgs = Array.isArray(req.user.org) ? req.user.org : [req.user.org];
    const createdBy = req.user.email; // email do usuário autenticado

    const form = {
      name,
      desc,
      fields: lines.flatMap((line) =>
        line.fields.map((field) => ({
          ...field,
        }))
      ),
      org: orgs.filter(Boolean),
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const doc = await db.collection("forms").add(form);
    await logAction(req, {
      action: "create",
      resourceType: "forms",
      resourceId: doc.id,
      metadata: { name },
    });
    res.status(201).json({ id: doc.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Listar formulários (filtra por org do usuário, se não for Admin)
exports.getForms = async (req, res) => {
  try {
    const { role, org: userOrg } = req.user || {};
    let snap;
    if (role === "Admin") {
      snap = await db.collection("forms").get();
    } else {
      const orgs = (Array.isArray(userOrg) ? userOrg : [userOrg]).filter(
        Boolean
      );
      if (orgs.length === 0) return res.json([]);
      const col = db.collection("forms");
      const [arrSnap, inSnap] = await Promise.all([
        col.where("org", "array-contains-any", orgs).get(),
        col.where("org", "in", orgs).get(),
      ]);
      const map = new Map();
      arrSnap.docs.forEach((doc) =>
        map.set(doc.id, { id: doc.id, ...doc.data() })
      );
      inSnap.docs.forEach((doc) =>
        map.set(doc.id, { id: doc.id, ...doc.data() })
      );
      const data = Array.from(map.values());
      await logAction(req, {
        action: "view_list",
        resourceType: "forms",
        metadata: { count: data.length },
      });
      return res.json(data);
    }
    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    await logAction(req, {
      action: "view_list",
      resourceType: "forms",
      metadata: { count: data.length },
    });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Buscar formulário por ID
exports.getForm = async (req, res) => {
  try {
    const doc = await db.collection("forms").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    await logAction(req, {
      action: "view",
      resourceType: "forms",
      resourceId: req.params.id,
    });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Atualizar formulário
exports.updateForm = async (req, res) => {
  try {
    await db.collection("forms").doc(req.params.id).update(req.body);
    await logAction(req, {
      action: "edit",
      resourceType: "forms",
      resourceId: req.params.id,
    });
    res.json({ status: "updated" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Deletar formulário
exports.deleteForm = async (req, res) => {
  try {
    await db.collection("forms").doc(req.params.id).delete();
    await logAction(req, {
      action: "delete",
      resourceType: "forms",
      resourceId: req.params.id,
    });
    res.json({ status: "deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
