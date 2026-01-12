const admin = require("firebase-admin");
const db = admin.firestore();

async function logAction(
  req,
  { action, resourceType, resourceId = null, metadata = {} }
) {
  try {
    const user = req.user || {};
    const entry = {
      action, // view | view_list | create | edit | delete
      resourceType, // forms | records | subforms | subrecords | system
      resourceId,
      actor: {
        uid: user.uid || null,
        email: user.email || null,
        role: user.role || null,
        org: user.org || null,
      },
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      metadata,
      timestamp: new Date(),
    };
    await db.collection("auditLogs").add(entry);
  } catch (err) {
    // Don't block the request on logging errors
    console.error("Audit log error:", err.message);
  }
}

module.exports = { logAction };
