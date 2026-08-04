import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  const envPath = path.resolve(__dirname, ".env");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (key) env[key] = value;
  }
  return env;
}

const dotEnv = loadEnvFile();

function createApiPlugin() {
  return {
    name: "api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, "http://localhost:3000");
        if (!url.pathname.startsWith("/dev-api/")) return next();

        const segments = url.pathname.split("/").filter(Boolean);
        if (segments.length < 2) return next();

        const handlerName = segments[1];

        if (req.method === "OPTIONS") {
          res.writeHead(200, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          });
          res.end();
          return;
        }

        try {
          if (dotEnv.SUPABASE_URL) process.env.SUPABASE_URL = dotEnv.SUPABASE_URL;
          if (dotEnv.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = dotEnv.SUPABASE_SERVICE_ROLE_KEY;
          if (dotEnv.WHATSAPP_PHONE) process.env.WHATSAPP_PHONE = dotEnv.WHATSAPP_PHONE;
          if (dotEnv.WHATSAPP_API_KEY) process.env.WHATSAPP_API_KEY = dotEnv.WHATSAPP_API_KEY;
          if (dotEnv.ALLOWED_ORIGINS) process.env.ALLOWED_ORIGINS = dotEnv.ALLOWED_ORIGINS;

          const handlerPath = path.resolve(__dirname, `api/${handlerName}.js`);
          const module = await import(pathToFileURL(handlerPath).href);
          const handler = module.default;

          const query = Object.fromEntries(url.searchParams.entries());

          let body = {};
          if (req.method !== "GET" && req.method !== "HEAD") {
            body = await new Promise((resolve) => {
              let data = "";
              req.on("data", (chunk) => (data += chunk));
              req.on("end", () => {
                try {
                  resolve(data ? JSON.parse(data) : {});
                } catch (e) {
                  resolve({});
                }
              });
              req.on("error", () => resolve({}));
            });
          }

          const mockReq = {
            method: req.method,
            query,
            body,
            env: {
              SUPABASE_URL: dotEnv.SUPABASE_URL || process.env.SUPABASE_URL,
              SUPABASE_SERVICE_ROLE_KEY: dotEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
              WHATSAPP_PHONE: dotEnv.WHATSAPP_PHONE || process.env.WHATSAPP_PHONE,
              WHATSAPP_API_KEY: dotEnv.WHATSAPP_API_KEY || process.env.WHATSAPP_API_KEY,
            },
          };
          const mockRes = {
            status: (code) => ({
              json: (data) => {
                res.writeHead(code, {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                });
                res.end(JSON.stringify(data));
              },
              end: () => res.end(),
            }),
            setHeader: () => {},
            getHeader: () => {},
          };

          await handler(mockReq, mockRes);
        } catch (e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, message: e.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), createApiPlugin()],
});
