const { Router } = require("express");
const {
  createForm,
  getForms,
  getForm,
  getFormsPaginated,
  updateForm,
  deleteForm,
} = require("../controllers/form");

const admin = require("firebase-admin");
const { authorize } = require("../middleware/permissions");

const router = Router();

// Função para buscar orgs de um formulário pelo ID
async function getFormOrgsById(req) {
  if (req.method === "POST") return req.user?.org || [];
  const doc = await admin
    .firestore()
    .collection("forms")
    .doc(req.params.id)
    .get();
  return doc.exists ? doc.data().org : [];
}

// Criar formulário
router.post("/", authorize("create", getFormOrgsById), createForm);
// Listar formulários (view: para cada item, filtrar no controller ou usar authorize em cada get)
router.get(
  "/",
  authorize("view", async (req) => req.user?.org || []),
  getForms
);
router.get(
  "/page/:page",
  authorize("view", async (req) => req.user?.org || []),
  getFormsPaginated
);
// Buscar formulário por ID
router.get("/:id", authorize("view", getFormOrgsById), getForm);
// Atualizar formulário
router.put("/:id", authorize("edit", getFormOrgsById), updateForm);
// Deletar formulário
router.delete("/:id", authorize("delete", getFormOrgsById), deleteForm);

module.exports = router;
