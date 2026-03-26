require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("node:path");

const { HOST, PORT } = require("./config");
const operationsRouter = require("./routes/operations");
const foldersRouter = require("./routes/folders");
const { errorHandler, notFoundHandler } = require("./middlewares/errorHandler");

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(morgan("dev"));

app.use(express.static(path.join(__dirname, "..", "client")));
app.use("/api", operationsRouter);
app.use("/api/folders", foldersRouter);

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server is healthy." });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
