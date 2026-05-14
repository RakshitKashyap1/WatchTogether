import fs from "node:fs/promises";
import http from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { config, validateRuntimeConfig } from "./config.js";
import { mountRoutes } from "./routes.js";
import { registerSocketHandlers } from "./sockets.js";

const app = express();
const server = http.createServer(app);
const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin || config.clientUrls.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
});

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
mountRoutes(app);
registerSocketHandlers(io);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: config.nodeEnv === "production" ? "Internal server error" : err.message });
});

async function start() {
  validateRuntimeConfig();
  await fs.mkdir(config.mediaRoot, { recursive: true });
  await fs.mkdir(config.uploadRoot, { recursive: true });

  server.listen(config.port, () => {
    console.log(`WatchTogether API listening on port ${config.port}`);
  });
}

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
