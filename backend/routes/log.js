const { Router } = require("express");
const { getLogs } = require("../controllers/log");

const router = Router();

// Only Admin/Manager should access; enforce simple guard here
router.get(
  "/",
  (req, res, next) => {
    const role = req.user?.role;
    if (role === "Admin" || role === "Manager") return next();
    return res.status(403).json({ error: "Forbidden" });
  },
  getLogs
);

module.exports = router;
