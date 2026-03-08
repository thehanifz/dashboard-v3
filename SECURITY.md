# Security Guidelines

## Protected Files

The following files contain sensitive information and should NEVER be committed to version control:

### Environment Files
- `backend/.env` - Backend server configuration
- `frontend/.env` - Frontend environment variables

### Credentials
- `backend/credentials.json` - Google Service Account credentials with private keys

## Setup Instructions

### 1. Initialize Git (if not already done)
```bash
git init
```

### 2. Protect Sensitive Files
Run this script to protect sensitive files:
```bash
chmod 600 backend/.env
chmod 600 backend/credentials.json
chmod 600 frontend/.env
```

### 3. For Team Members

Each team member should:
1. Copy `.env.example` to `.env` in both `backend/` and `frontend/` directories
2. Fill in their own credentials
3. Never share or commit actual credentials

### 4. Google Cloud Credentials

To set up `credentials.json`:
1. Go to Google Cloud Console
2. Create a Service Account
3. Download the JSON key file
4. Save it as `backend/credentials.json`
5. Set permissions: `chmod 600 backend/credentials.json`

## File Permissions

| File | Permission | Description |
|------|------------|-------------|
| `backend/.env` | 600 | Read/Write for owner only |
| `backend/credentials.json` | 600 | Read/Write for owner only |
| `frontend/.env` | 600 | Read/Write for owner only |

## Checklist

- [x] `.gitignore` created with all sensitive file patterns
- [ ] Git repository initialized
- [ ] Sensitive file permissions set to 600
- [ ] Team members have their own `.env` files
- [ ] No credentials committed to repository

## Emergency

If credentials are accidentally committed:
1. Immediately rotate/replace the credentials in Google Cloud Console
2. Remove the file from git history
3. Update `.gitignore` if needed
4. Notify team members
