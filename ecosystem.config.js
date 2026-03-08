module.exports = {
  apps: [
    {
      name: "dashboard-v3-backend",
      cwd: "/root/main-app/dashboard-v3/backend",
      script: "/root/main-app/dashboard-v3/backend/venv/bin/uvicorn",
      args: "main:app --host 0.0.0.0 --port 661 --workers 2",
      interpreter: "none",
      env: {
        ENV: "production",
        PATH: "/root/main-app/dashboard-v3/backend/venv/bin:/usr/bin:/bin",
      },
      error_file: "/root/main-app/dashboard-v3/backend/logs/error.log",
      out_file:   "/root/main-app/dashboard-v3/backend/logs/out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};