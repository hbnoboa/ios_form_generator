const { Router } = require("express");
const {
  createRecord,
  getRecords,
  getRecord,
  updateRecord,
  deleteRecord,
  getRecordsPaginated,
} = require("../controllers/record");
const admin = require("firebase-admin");
const { authorize } = require("../middleware/permissions");

const router = Router();

// Paginação de registros: /api/records/page/:page
router.get(
  "/page/:page",
  authorize("view", async (req) => req.user?.org || []),
  getRecordsPaginated
);

// Função para buscar orgs de um registro pelo ID
async function getRecordOrgsById(req) {
  if (req.method === "POST") return req.user?.org || [];
  const doc = await admin
    .firestore()
    .collection("records")
    .doc(req.params.id)
    .get();
  return doc.exists ? doc.data().org : [];
}

router.post("/", authorize("create", getRecordOrgsById), createRecord);
router.get(
  "/",
  authorize("view", async (req) => req.user?.org || []),
  getRecords
);
router.get("/:id", authorize("view", getRecordOrgsById), getRecord);
router.put("/:id", authorize("edit", getRecordOrgsById), updateRecord);
router.delete("/:id", authorize("delete", getRecordOrgsById), deleteRecord);

module.exports = router;
