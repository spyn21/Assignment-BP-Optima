const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

const {
  documentJobRoutes,
  startDocumentWorkers,
} = require("./docprocessing");

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/document-jobs", documentJobRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// Basic error handler so async route failures don't crash the server.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled API error:", err?.message || err);
  res.status(500).json({ error: "Internal server error" });
});

startDocumentWorkers();

const initialPort = Number(process.env.PORT) || 8000;

// Function to start the server with automatic port retry
const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`Document processing API running on port ${port}`);
  });

  // Listen for errors on the server object
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`⚠️ Port ${port} is already in use. Trying port ${port + 1}...`);
      startServer(port + 1); // Try the next port up
    } else {
      console.error("Server error:", err);
    }
  });
};

// Initialize server
startServer(initialPort);