require("dotenv").config();

const path = require("path");

const ROOT = __dirname;
const BACKEND = path.join(ROOT, "backend");

const HOST = process.env.HOST;
const PORT = process.env.PORT ;

module.exports = {
  apps: [
    {
      name: "dashpub-backend",
      cwd: BACKEND,
      script: path.join(BACKEND, "venv/bin/uvicorn"),
      args: `main:app --host ${HOST} --port ${PORT} --workers 2`,
      interpreter: "none",

      env: {
        ENV: "production",
        PATH: `${path.join(BACKEND, "venv/bin")}:/usr/bin:/bin`,
        HOST,
        PORT,
      },

      error_file: path.join(BACKEND, "logs/error.log"),
      out_file: path.join(BACKEND, "logs/out.log"),
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};