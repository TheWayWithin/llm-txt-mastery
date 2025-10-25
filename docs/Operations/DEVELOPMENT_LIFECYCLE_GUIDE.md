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

| Environment | Branch | Frontend | Backend | Database | Purpose |
|------------|--------|----------|---------|----------|---------|
| Production | `main` | llmtxtmastery.com | llm-txt-mastery-production.up.railway.app | Neon: **Production Project** | Live users, real data |
| Staging | `develop` | develop--llm-txt-mastery.netlify.app | llm-txt-mastery-staging.up.railway.app | Neon: **Staging Project** | Final checks, test data |
| Preview | `feature/...` | pr-123--llm-txt-mastery.netlify.app | *(uses staging backend)* | *(uses staging database)* | PR testing |

---

## Database Environments

**🚨 CRITICAL**: Production and Staging use **separate Neon PostgreSQL projects** - they are completely isolated.

### Database Projects

**Production Database**:
- **Provider**: Neon PostgreSQL (managed)
- **Project**: Production project (separate Neon project)
- **Usage**: Live customer data, real transactions
- **Access**: Railway production environment only
- **Backups**: Automatic daily backups via Neon
- **⚠️ NEVER**: Use production database for testing

**Staging Database**:
- **Provider**: Neon PostgreSQL (managed)
- **Project**: Staging project (separate Neon project)
- **Usage**: Test data, QA validation
- **Access**: Railway staging environment only
- **Schema**: Mirrors production (same tables, structure)
- **Data**: Separate test data, safe to reset

### How Database Separation Works

```
Your Code Changes:
┌─────────────────────────────────────────────────────────────┐
│ feature/new-feature → develop → main                        │
│                          ↓         ↓                         │
│                      Staging   Production                    │
└─────────────────────────────────────────────────────────────┘

Database Projects (SEPARATE - No Connection):
┌──────────────────────────┐  ┌──────────────────────────────┐
│   Staging Database       │  │   Production Database        │
│   (Neon Project A)       │  │   (Neon Project B)           │
│                          │  │                              │
│   • Test data            │  │   • Live customer data       │
│   • Safe to experiment   │  │   • Protected by guardrails  │
│   • Reset anytime        │  │   • Automatic backups        │
└──────────────────────────┘  └──────────────────────────────┘
```

### Environment Variable Protection

**Railway automatically sets the correct DATABASE_URL for each environment**:

- **Production Railway** → Gets production Neon connection string
- **Staging Railway** → Gets staging Neon connection string

**Startup Guardrails** (prevents mistakes):
```
✅ Production startup validates:
   - DATABASE_URL doesn't contain 'localhost', 'test', 'dev', 'local'
   - JWT secrets are 64+ characters
   - API keys are properly formatted

❌ If validation fails → Server won't start (hard block)
```

### Database Migration Workflow

When you add new database tables/columns:

1. **Create migration file** (e.g., `migrations/008_add_new_table.sql`)
2. **Test on Staging**:
   - Merge to `develop` branch
   - Auto-deploys to staging
   - Migration runs on **staging database**
   - Verify with test data
3. **Deploy to Production**:
   - Merge to `main` branch
   - Auto-deploys to production
   - Migration runs on **production database**
   - Live data migrated safely

**🔒 Safety**: Migrations run automatically on deployment, but each environment's database is separate.

### Verifying Database Connection

After deployment, check Railway logs:

```bash
# Good - Correct database
✅ Database configuration is secure
✅ ALL SECURITY VALIDATIONS PASSED
Connected to Neon PostgreSQL

# Bad - Wrong database detected
❌ CRITICAL: Database URL points to localhost in production
❌ CRITICAL: Test/development database detected in production
🚨 STARTUP ABORTED: Critical security issues must be resolved
```

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
