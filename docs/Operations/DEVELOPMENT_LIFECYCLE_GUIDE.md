# Development Lifecycle Guide

**Purpose**: Simple, repeatable workflow for shipping code safely.

---

## ⚠️ BEFORE SETTING UP STAGING

**Haven't set up staging yet?** → Read **DEVOPS-IMPLEMENTATION_PLAN.md** and complete Pre-Flight checklist first.

**THE RULE**: Staging must mirror production exactly (same database provider, same hosting).

Skip this = waste hours debugging. 15-minute checklist saves you.

---

## The Workflow

**Branches**:
- **`main`**: Production code (sacred, tested only)
- **`develop`**: Staging code (in-progress features)
- **`feature/...`**: Your work (temporary, deleted after merge)

**Environments**:

| Environment | Branch | URL | Purpose |
|------------|--------|-----|---------|
| Production | `main` | `app.com` | Live users |
| Staging | `develop` | `develop.app.com` | Final checks |
| Preview | `feature/...` | `pr-123.app.com` | PR testing |

---

## Daily Feature Development

1. **Start**: Create branch from `develop`
   ```bash
   git checkout -b feature/user-profile
   ```

2. **Build**: Write code, make small commits
   ```bash
   git commit -m "feat: add avatar upload"
   ```

3. **Test**: Push branch, open PR to `develop`
   - Automated tests run
   - Preview URL deployed
   - Green check ✅ = safe to merge

4. **Stage**: Merge PR → Auto-deploys to staging
   - Test all features work together
   - Verify on `develop.app.com`

5. **Release**: PR from `develop` to `main`
   - Final tests run
   - Merge → Auto-deploys to production

---

## Emergency Hotfix (Production Bug)

1. Create branch from `main`: `git checkout -b hotfix/fix-login`
2. Fix bug, open PR to `main`
3. Merge → Auto-deploys to production
4. **CRITICAL**: Also merge hotfix into `develop` (keeps branches in sync)

---

## Common Issues

**CORS blocking preview deploys**:
- Error: "Blocked by CORS policy" in browser console
- Fix: Update `server/middleware/security.ts` to allow `netlify.app` domains
- See DEVOPS-IMPLEMENTATION_PLAN.md Phase 2 Step 6 for code

**Database connection errors**:
- Error: "SSL required" or "connection failed"
- Fix: Add `?sslmode=require` to DATABASE_URL in Railway
- Redeploy after updating

**Environment variables not applying**:
- Railway: Deployments → Click "Redeploy"
- Netlify: Deploys → "Trigger deploy" → "Clear cache"
- Wait 2-3 minutes for deployment
