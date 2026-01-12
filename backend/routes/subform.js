const { Router } = require("express");
const {
  createSubform,
  getSubforms,
  getSubform,
  updateSubform,
  deleteSubform,
  getSubformsPaginated,
} = require("../controllers/subform");
const admin = require("firebase-admin");
const { authorize } = require("../middleware/permissions");

const router = Router();

// Paginação de subformulários: /api/subforms/page/:page
router.get(
  "/page/:page",
  authorize("view", async (req) => req.user?.org || []),
  getSubformsPaginated
);

// Função para buscar orgs de um subformulário pelo ID
async function getSubformOrgsById(req) {
  if (req.method === "POST") return req.user?.org || [];
  const doc = await admin
    .firestore()
    .collection("subforms")
    .doc(req.params.id)
    .get();
  return doc.exists ? doc.data().org : [];
}

router.post("/", authorize("create", getSubformOrgsById), createSubform);
router.get(
  "/",
  authorize("view", async (req) => req.user?.org || []),
  getSubforms
);
router.get("/:id", authorize("view", getSubformOrgsById), getSubform);
router.put("/:id", authorize("edit", getSubformOrgsById), updateSubform);
router.delete("/:id", authorize("delete", getSubformOrgsById), deleteSubform);

module.exports = router;
