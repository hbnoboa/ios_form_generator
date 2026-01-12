// Paginação de subformulários (10 por página)
exports.getSubformsPaginated = async (req, res) => {
  try {
    const { role, org: userOrg } = req.user || {};
    const page = parseInt(req.params.page, 10) || 1;
    const pageSize = 10;
    let all = [];
    if (role === "Admin") {
      const snap = await db
        .collection("subforms")
        .orderBy("createdAt", "desc")
        .get();
      all = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      const orgsRaw = Array.isArray(userOrg) ? userOrg : [userOrg];
      const orgs = orgsRaw.filter((o) => o != null && o !== "");
      if (orgs.length > 0) {
        const coll = db.collection("subforms");
        const results = new Map();
        // org stored as array
        try {
          const snapArr = await coll
            .where("org", "array-contains-any", orgs)
            .get();
          snapArr.docs.forEach((doc) =>
            results.set(doc.id, { id: doc.id, ...doc.data() })
          );
        } catch (_) {}
        // org stored as scalar string
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

// Criar subformulário
exports.createSubform = async (req, res) => {
  try {
    const { name, desc, lines } = req.body;
    const org = req.user?.org || [];
    const createdBy = req.user?.email || "";
    const formId = req.body.formId ?? req.body.form ?? null;

    const fields = Array.isArray(lines)
      ? lines.flatMap((line) => line.fields.map((field) => ({ ...field })))
      : Array.isArray(req.body.fields)
      ? req.body.fields
      : [];

    const subform = {
      formId,
      name,
      desc,
      fields,
      org,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const doc = await db.collection("subforms").add(subform);
    await logAction(req, {
      action: "create",
      resourceType: "subforms",
      resourceId: doc.id,
      metadata: { name },
    });
    res.status(201).json({ id: doc.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Listar subformularios (filtra por org do usuário, se não for Admin)
exports.getSubforms = async (req, res) => {
  try {
    const { role, org: userOrg } = req.user || {};
    let data = [];
    if (role === "Admin") {
      const snap = await db.collection("subforms").get();
      data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      const orgsRaw = Array.isArray(userOrg) ? userOrg : [userOrg];
      const orgs = orgsRaw.filter((o) => o != null && o !== "");
      if (orgs.length === 0) {
        data = [];
      } else {
        const coll = db.collection("subforms");
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
      resourceType: "subforms",
      metadata: { count: data.length },
    });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Buscar subformulário por ID
exports.getSubform = async (req, res) => {
  try {
    const doc = await db.collection("subforms").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    await logAction(req, {
      action: "view",
      resourceType: "subforms",
      resourceId: req.params.id,
    });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Atualizar subformulário
exports.updateSubform = async (req, res) => {
  try {
    const payload = { ...req.body };
    // Map 'form' to 'formId' if present
    if (payload.form && !payload.formId) {
      payload.formId = payload.form;
      delete payload.form;
    }
    // If lines provided, flatten into fields
    if (Array.isArray(payload.lines)) {
      payload.fields = payload.lines.flatMap((line) =>
        line.fields.map((field) => ({ ...field }))
      );
      delete payload.lines;
    }
    // Always bump updatedAt
    payload.updatedAt = new Date();

    await db.collection("subforms").doc(req.params.id).update(payload);
    await logAction(req, {
      action: "edit",
      resourceType: "subforms",
      resourceId: req.params.id,
    });
    res.json({ status: "updated" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Deletar subformulário
exports.deleteSubform = async (req, res) => {
  try {
    await db.collection("subforms").doc(req.params.id).delete();
    await logAction(req, {
      action: "delete",
      resourceType: "subforms",
      resourceId: req.params.id,
    });
    res.json({ status: "deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
