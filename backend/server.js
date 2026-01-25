require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const admin = require("firebase-admin");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));
app.use(express.json());

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Heroku: credentials from environment variable
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Local: credentials from file
  serviceAccount = require("./serviceAccountKey.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log(serviceAccount.project_id);

const authMiddleware = require("./middleware/auth");

const userRoute = require("./routes/user");
const formRoute = require("./routes/form");
const subformRoute = require("./routes/subform");
const recordRoute = require("./routes/record");
const subrecordRoute = require("./routes/subrecord");
const logRoute = require("./routes/log");

// Health check route
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "IOS Forms API is running" });
});

app.use("/api/users", userRoute);
app.use("/api/forms", authMiddleware, formRoute);
app.use("/api/subforms", authMiddleware, subformRoute);
app.use("/api/records", authMiddleware, recordRoute);
app.use("/api/subrecords", authMiddleware, subrecordRoute);
app.use("/api/logs", authMiddleware, logRoute);

io.on("connection", (socket) => {
  console.log("Novo cliente conectado:", socket.id);
  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
