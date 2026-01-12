const admin = require("firebase-admin");
const db = admin.firestore();

// List audit logs (Admin sees all; Manager sees own org)
exports.getLogs = async (req, res) => {
  try {
    const { role, org: userOrg } = req.user || {};
    const limit = Math.min(parseInt(req.query.limit || "100", 10), 500);
    let query = db.collection("auditLogs").orderBy("timestamp", "desc");

    const normalize = (doc) => {
      const e = { id: doc.id, ...doc.data() };
      const ts = e.timestamp;
      try {
        if (ts && typeof ts.toDate === "function") {
          e.timestamp = ts.toDate().toISOString();
        } else if (
          ts &&
          (ts.seconds !== undefined || ts._seconds !== undefined)
        ) {
          const seconds = ts.seconds ?? ts._seconds ?? 0;
          const nanos = ts.nanoseconds ?? ts._nanoseconds ?? 0;
          e.timestamp = new Date(
            seconds * 1000 + Math.floor(nanos / 1e6)
          ).toISOString();
        } else if (typeof ts === "string") {
          // assume ISO string already
        } else {
          e.timestamp = new Date().toISOString();
        }
      } catch {
        e.timestamp = new Date().toISOString();
      }
      return e;
    };

    // For Manager: filter by actor.org intersection
    if (role === "Manager") {
      const orgs = Array.isArray(userOrg) ? userOrg : [userOrg];
      // Firestore doesn't support array intersection filters well; we fetch and filter in memory for simplicity
      const snap = await query.limit(limit).get();
      const data = snap.docs
        .map(normalize)
        .filter((e) => {
          const actorOrg = e.actor?.org;
          const arr = Array.isArray(actorOrg) ? actorOrg : [actorOrg];
          return orgs.some((o) => arr.includes(o));
        })
        .filter((e) => ["POST", "PUT", "DELETE"].includes(e.method));
      return res.json({ data });
    }

    // Admin or others: return latest logs (others should not access; enforce in route)
    const snap = await query.limit(limit).get();
    const data = snap.docs
      .map(normalize)
      .filter((e) => ["POST", "PUT", "DELETE"].includes(e.method));
    res.json({ data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
