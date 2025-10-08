# DevOps Implementation Plan

**Goal:** Set up staging environment and automated lifecycle for your project.

---

## PRE-FLIGHT: 15-Minute Setup Checklist (DO THIS FIRST)

**THE GOLDEN RULE**: Staging MUST mirror production infrastructure exactly. No exceptions.

### Quick Checklist

- [ ] **Read architecture.md completely** (5 min)
  - Find "Infrastructure Architecture" section
  - Note database provider (Neon? Supabase? other?)
  - Note backend host (Railway? other?)
  - Note frontend host (Netlify? Vercel?)

- [ ] **Verify platform access** (3 min)
  - Log in to database provider dashboard
  - Log in to backend hosting dashboard
  - Log in to frontend hosting dashboard

- [ ] **List production environment variables** (5 min)
  - Backend: DATABASE_URL, API keys, secrets
  - Frontend: VITE_API_URL, public keys
  - Note which variables staging needs

- [ ] **Note production URLs** (2 min)
  - Frontend URL
  - Backend API URL
  - Database connection string

**STOP**: If architecture.md doesn't match production, fix that FIRST before continuing.

---

### Phase 1: Pre-Commit Guardrails (Local Setup)

**Objective:** Catch errors and formatting issues before they are even committed. This is your first line of defense.

1.  **Install Local Tooling:**
    - Run this in your project's terminal:
      ```bash
      npm install --save-dev eslint prettier eslint-plugin-prettier eslint-config-prettier vitest
      ```

2.  **Configure ESLint & Prettier:**
    - Create a `.eslintrc.json` file in your project root:
      ```json
      {
        "extends": ["eslint:recommended", "prettier"],
        "plugins": ["prettier"],
        "rules": {
          "prettier/prettier": "error"
        }
      }
      ```
    - Create a `.prettierrc` file:
      ```json
      {
        "semi": true,
        "singleQuote": true,
        "trailingComma": "es5"
      }
      ```

3.  **Add Scripts to `package.json`:**
    - Add these scripts to your `package.json` file:
      ```json
      "scripts": {
        "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
        "format": "prettier --write .",
        "test:unit": "vitest"
      }
      ```
    - **Your new habit:** Run `npm run format && npm run lint && npm run test:unit` before you push your code.

---

### Phase 2: Staging Environment Setup

**Prerequisite**: Complete Pre-Flight checklist above.

**Verify before continuing**:
- [ ] You know what database provider production uses
- [ ] You have access to all platform dashboards
- [ ] Architecture.md matches production

1.  **Create a `develop` Branch:**
    - This branch will contain the code for your `staging` environment.
    - In your project folder, run:
      ```bash
      git checkout main
      git pull
      git checkout -b develop
      git push -u origin develop
      ```
    - In GitHub, go to your repository's **Settings > Branches**. Set `develop` as the default branch.

2.  **Set Up Staging Database:**
    - **CRITICAL**: Use SAME provider as production (Neon, Supabase, etc.)
    - Create new project: `[project-name]-staging`
    - Use SAME region as production
    - Save connection string/password

    **Export Production Schema:**
    ```bash
    # For Neon/PostgreSQL:
    pg_dump "postgresql://[prod-connection]" --schema-only --no-owner --file=schema.sql

    # For Supabase:
    supabase db dump --db-url "postgresql://[prod-connection]" -f schema.sql
    ```

    **Clean for compatibility (if needed):**
    ```bash
    # Example: Neon → Supabase
    sed 's/neondb_owner/postgres/g' schema.sql > clean-schema.sql
    ```

    **Import to staging:**
    ```bash
    psql "[staging-connection]" -f clean-schema.sql
    ```

    **Verify**: Check dashboard - tables should match production count.

    **TROUBLESHOOTING - Database Connection Errors:**
    - **Error**: "SSL required" or "connection refused"
    - **Fix**: Add `?sslmode=require` to end of DATABASE_URL
    - **Example**: `postgresql://user:pass@host:5432/db?sslmode=require`

3.  **Set Up Railway Staging:**
    - Go to Railway dashboard → Open project
    - Click "production" dropdown → "+ New Environment"
    - Choose "Duplicate Environment" (NOT Empty)
    - Name it `staging`
    - In staging environment: Settings > Source → Change branch to `develop`

4.  **Set Up Netlify Staging:**
    - Go to your site in Netlify
    - Site configuration > Build & deploy > Continuous Deployment
    - Under "Branches": Add `develop`
    - Note the URL: `develop--[sitename].netlify.app`

5.  **Configure Environment Variables:**

    **Railway Staging (Variables tab):**
    - `DATABASE_URL`: `postgresql://[staging-connection]?sslmode=require`
    - `SUPABASE_URL`: Staging project URL (if using Supabase)
    - `SUPABASE_SERVICE_ROLE_KEY`: Staging service key
    - `FRONTEND_URL`: `https://develop--[sitename].netlify.app`
    - Click "Redeploy" after adding variables

    **Netlify Branch Deploy (Environment variables):**
    - `VITE_API_URL`: Staging Railway URL
    - `VITE_SUPABASE_URL`: Staging project URL
    - `VITE_SUPABASE_ANON_KEY`: Staging anon key
    - Scope each to "develop" branch only
    - Trigger manual redeploy if needed (Deploys tab)

    **TROUBLESHOOTING - Variables Not Applying:**
    - **Symptom**: Changes don't take effect
    - **Railway Fix**: Go to Deployments → Click "Redeploy"
    - **Netlify Fix**: Deploys tab → "Trigger deploy" → "Clear cache"
    - **Wait**: 2-3 minutes for deployment to complete

**VERIFICATION (Complete these before continuing):**

- [ ] Test backend health: `https://[railway-url]/health` returns 200 OK
- [ ] Check Railway logs: No database connection errors
- [ ] Test login: `https://develop--[site].netlify.app/login` works
- [ ] Browser console: No CORS errors (if yes, see Step 6)

**If verification fails**: Read Railway logs FIRST, fix actual error, redeploy, re-verify.

6.  **Fix CORS for Branch Deploys:**
    - Open `server/middleware/security.ts`
    - Add Netlify preview support:
      ```typescript
      const isNetlifyPreview = (origin: string) => {
        return origin.includes('netlify.app');
      };

      // In CORS config:
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || isNetlifyPreview(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
      ```
    - Commit and push to `develop` branch

    **TROUBLESHOOTING - CORS Blocking:**
    - **Symptom**: "Blocked by CORS policy" in browser console
    - **Fix**: Add Netlify preview pattern above
    - **Verify**: Check Network tab - requests should succeed

---

### Phase 3: GitHub Actions (Optional - for automation)

**Skip this if you want manual deployments only.**

1.  **Create `.github/workflows/test-and-deploy.yml`:**
    - Copy template from GitHub Actions docs
    - Configure for your site name and secrets
    - Test runs on PRs, deploys on merge

2.  **Protect `main` Branch:**
    - GitHub Settings > Branches
    - Add protection rule for `main`
    - Require PR + passing tests before merge

---

### Phase 4: Emergency Procedures

**Database Rollback:**
- Go to database provider dashboard
- Navigate to Backups section
- Restore last known good backup
- Fix migration code immediately

**Application Rollback:**
- **Netlify**: Deploys tab → Find last good deploy → "Publish deploy"
- **Railway**: Deployments → Find last good → Click "Redeploy"
- Create hotfix branch to properly fix bug

---

## Lessons Learned

**Real Disaster**: Set up Supabase for staging when production uses Neon. 8+ hours wasted debugging.

### The 5 Critical Mistakes

1. ❌ **Didn't read architecture.md first** → Set up wrong database provider
2. ❌ **Used different infrastructure than production** → Hard-to-debug errors
3. ❌ **Skipped verification testing** → Moved to next phase with broken setup
4. ❌ **Debugged assumptions, not logs** → Wasted hours on wrong problem
5. ❌ **Walls of text instead of checklists** → User confusion and mistakes

### The Prevention

✅ **Complete Pre-Flight checklist** (15 min) - saves hours of debugging
✅ **Staging mirrors production exactly** - same provider, same region
✅ **Verify after each phase** - login must WORK, not "should work"
✅ **Read logs first** - debug actual errors, not assumptions
✅ **Use simple checklists** - one step at a time with clear STOP points

### Time Comparison

| Approach | Time | Outcome |
|----------|------|---------|
| With pre-flight | ~2.5 hours | Works first time |
| Without pre-flight | ~10+ hours | Required rebuild |

**Conclusion**: 15-minute pre-flight checklist prevents hours/days of debugging.

### Emergency Recovery

**If you already set up staging wrong**:

1. Read architecture.md - identify correct provider
2. Create new staging database - use correct provider
3. Export production schema: `pg_dump [prod-url] --schema-only -f schema.sql`
4. Import to new staging: `psql [staging-url] -f schema.sql`
5. Update Railway DATABASE_URL - point to new database
6. Verify end-to-end - test login works
7. Clean up old resources after 24h

**Key**: Production database is golden standard, NOT migration files.
