const path = require("path");

// __dirname = folder tempat ecosystem.config.js berada (root repo)
const ROOT = __dirname;
const BACKEND = path.join(ROOT, "backend");

module.exports = {
  apps: [
    {
      name: "dashboard-v3-backend",
      cwd: BACKEND,
      script: path.join(BACKEND, "venv/bin/uvicorn"),
      args: "main:app --host 0.0.0.0 --port 661 --workers 2",
      interpreter: "none",
      env: {
        ENV: "production",
        PATH: `${path.join(BACKEND, "venv/bin")}:/usr/bin:/bin`,
      },
      error_file: path.join(BACKEND, "logs/error.log"),
      out_file:   path.join(BACKEND, "logs/out.log"),
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
