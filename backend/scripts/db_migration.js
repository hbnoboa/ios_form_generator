/*
Simple Firestore migration utility for updating record counters and renaming keys.

Usage examples:
  # Recalculate counts for a specific subform across all records
  node scripts/db_migration.js recalc --subformId=S1

  # Recalculate count for a specific (record, subform) pair
  node scripts/db_migration.js recalc --recordId=R1 --subformId=S1

  # Rename recordData key for all records of a form
  node scripts/db_migration.js rename --formId=F1 --oldName=Old --newName=New

Environment:
  Set FIREBASE_SERVICE_ACCOUNT_PATH to the absolute path of your service account JSON,
  or ensure backend/serviceAccountKey.json exists (default).
*/

const path = require("path");
const admin = require("firebase-admin");

function initFirebase() {
  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.resolve(__dirname, "../serviceAccountKey.json");
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin.firestore();
}

async function getSubformName(db, subformId) {
  try {
    const snap = await db.collection("subforms").doc(subformId).get();
    if (snap.exists) {
      const data = snap.data() || {};
      return data.name || subformId;
    }
  } catch (_) {}
  return subformId;
}

async function recalcForRecordSubform(db, recordId, subformId) {
  const subformName = await getSubformName(db, subformId);
  const listSnap = await db
    .collection("subrecords")
    .where("record", "==", recordId)
    .where("subform", "==", subformId)
    .get();
  const count = listSnap.size;

  const recRef = db.collection("records").doc(recordId);
  const recSnap = await recRef.get();
  if (!recSnap.exists) {
    console.log(`Record ${recordId} not found.`);
    return;
  }
  const current = recSnap.data() || {};
  const recordData = { ...(current.recordData || {}) };
  recordData[subformName] = { value: count, type: "number" };
  await recRef.update({ recordData, updatedAt: new Date().toISOString() });
  console.log(
    `Updated count for record ${recordId}, subform ${subformName}: ${count}`
  );
}

async function recalcForSubformAllRecords(db, subformId) {
  console.log(
    `Recalculating counts for subform ${subformId} across all records...`
  );
  const snap = await db
    .collection("subrecords")
    .where("subform", "==", subformId)
    .get();
  if (snap.empty) {
    console.log("No subrecords found for this subform.");
    return;
  }
  const groups = new Map(); // recordId -> count
  snap.forEach((doc) => {
    const data = doc.data() || {};
    const recId = data.record;
    if (!recId) return;
    groups.set(recId, (groups.get(recId) || 0) + 1);
  });
  for (const [recordId, _] of groups.entries()) {
    await recalcForRecordSubform(db, recordId, subformId);
  }
  console.log("Recalculation complete.");
}

async function renameKeyForForm(db, formId, oldName, newName) {
  console.log(
    `Renaming key in recordData from "${oldName}" to "${newName}" for form ${formId}...`
  );
  // Records may store form reference in different fields; check both
  const q1 = db.collection("records").where("form", "==", formId);
  const q2 = db.collection("records").where("formId", "==", formId);

  const [snap1, snap2] = await Promise.all([q1.get(), q2.get()]);
  const seen = new Set();
  const docs = [];
  snap1.forEach((d) => {
    if (!seen.has(d.id)) {
      seen.add(d.id);
      docs.push(d);
    }
  });
  snap2.forEach((d) => {
    if (!seen.has(d.id)) {
      seen.add(d.id);
      docs.push(d);
    }
  });

  if (docs.length === 0) {
    console.log("No records found for form.");
    return;
  }

  for (const d of docs) {
    const data = d.data() || {};
    const recordData = { ...(data.recordData || {}) };
    if (Object.prototype.hasOwnProperty.call(recordData, oldName)) {
      recordData[newName] = recordData[oldName];
      delete recordData[oldName];
      await db
        .collection("records")
        .doc(d.id)
        .update({ recordData, updatedAt: new Date().toISOString() });
      console.log(`Updated record ${d.id}`);
    }
  }
  console.log("Rename complete.");
}

async function main() {
  const db = initFirebase();
  const args = process.argv.slice(2);
  const cmd = args[0];
  const argMap = {};
  for (const a of args.slice(1)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) argMap[m[1]] = m[2];
  }
  try {
    if (cmd === "recalc") {
      const { recordId, subformId } = argMap;
      if (!subformId) {
        console.error("Missing --subformId");
        process.exit(1);
      }
      if (recordId) await recalcForRecordSubform(db, recordId, subformId);
      else await recalcForSubformAllRecords(db, subformId);
    } else if (cmd === "rename") {
      const { formId, oldName, newName } = argMap;
      if (!formId || !oldName || !newName) {
        console.error("Missing --formId, --oldName, or --newName");
        process.exit(1);
      }
      await renameKeyForForm(db, formId, oldName, newName);
    } else {
      console.log("Unknown command. Valid commands: recalc, rename");
      process.exit(1);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
