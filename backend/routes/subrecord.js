const { getSubrecordsPaginated } = require("../controllers/subrecord");
const { Router } = require("express");
const {
  createSubrecord,
  getSubrecords,
  getSubrecord,
  updateSubrecord,
  deleteSubrecord,
} = require("../controllers/subrecord");
const admin = require("firebase-admin");
const { authorize } = require("../middleware/permissions");

const router = Router();

// Função para buscar orgs de um subregistro pelo ID
async function getSubrecordOrgsById(req) {
  if (req.method === "POST") return req.user?.org || [];
  const doc = await admin
    .firestore()
    .collection("subrecords")
    .doc(req.params.id)
    .get();
  return doc.exists ? doc.data().org : [];
}

router.post("/", authorize("create", getSubrecordOrgsById), createSubrecord);
router.get(
  "/",
  authorize("view", async (req) => req.user?.org || []),
  getSubrecords
);
// Paginação de subregistros: /api/subrecords/page/:page
router.get(
  "/page/:page",
  authorize("view", async (req) => req.user?.org || []),
  getSubrecordsPaginated
);
router.get("/:id", authorize("view", getSubrecordOrgsById), getSubrecord);
router.put("/:id", authorize("edit", getSubrecordOrgsById), updateSubrecord);
router.delete(
  "/:id",
  authorize("delete", getSubrecordOrgsById),
  deleteSubrecord
);

module.exports = router;
