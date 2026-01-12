const { Router } = require("express");
const { createUserWithClaims, listUsers } = require("../controllers/user");
const { deleteUser } = require("../controllers/user");
const auth = require("../middleware/auth");

const router = Router();

// Rota para criar usuário com claims
router.post("/register", createUserWithClaims);
router.get("/me", auth, (req, res) => {
  res.json({ user: req.user });
});

// List users (Admin/Manager only)
router.get(
  "/",
  auth,
  (req, res, next) => {
    const role = req.user?.role;
    if (role === "Admin" || role === "Manager") return next();
    return res.status(403).json({ error: "Forbidden" });
  },
  listUsers
);

// Delete user (Admin only)
router.delete(
  "/:id",
  auth,
  (req, res, next) => {
    const role = req.user?.role;
    if (role === "Admin") return next();
    return res.status(403).json({ error: "Forbidden" });
  },
  deleteUser
);

module.exports = router;
