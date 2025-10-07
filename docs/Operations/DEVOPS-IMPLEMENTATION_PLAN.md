# Implementation Plan: A Mature & Automated Lifecycle

**Goal:** Migrate one existing project (e.g., `llmtxtmastery.com`) to a robust, automated, and safe development lifecycle.

---

### Phase 0: Pre-Commit Guardrails (Local Setup)

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

### Phase 1: Foundational Setup (Environments & Secrets)

**Objective:** Create separate `staging` and `production` environments and link them to the correct Git branches.

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

2.  **Set Up the `staging` Supabase Project:**
    - This project is the dedicated database for your `staging` environment.
    - Go to [supabase.com](https://supabase.com) and click **"New project"**.
    - Name it `llmtxtmastery-staging` (or `[project-name]-staging`).
    - Choose the same region as your production database.
    - Save the database password securely.

    **Copy Production Database Schema:**
    - **Why:** Your production database is the "golden standard" - it has all the fixes and adjustments made over time. Migration files may be outdated.
    - Install Supabase CLI if you haven't: `brew install supabase/tap/supabase`
    - Export production schema:
      ```bash
      supabase db dump --db-url "postgresql://[prod-connection-string]" -f production-schema.sql
      ```
    - Clean the schema for Supabase compatibility:
      ```bash
      sed 's/neondb_owner/postgres/g' production-schema.sql > staging-schema.sql
      grep -v "neon_superuser" staging-schema.sql > staging-schema-final.sql
      ```
    - Open `staging-schema-final.sql` in your editor
    - Copy all contents (Cmd+A, Cmd+C)
    - Go to your staging Supabase project → SQL Editor
    - Paste and click **"Run"**
    - Verify in **Table Editor** that all tables were created successfully

3.  **Set Up the `staging` Railway Environment:**
    - This is the backend server for your `staging` environment.
    - **Login to Railway CLI** (if not already linked):
      ```bash
      railway login
      railway link
      ```
      - Select your workspace, project, and production environment
      - Press Escape when prompted for service selection

    - **Create staging environment via Railway Dashboard:**
      - Go to [railway.app](https://railway.app) and open your project
      - Click the **"production"** dropdown at the top
      - Select **"+ New Environment"**
      - Choose **"Duplicate Environment"** (NOT Empty Environment)
      - Name it `staging`
      - Click **"Deploy"**
      - This automatically copies all services and configuration from production

    - **Connect staging to develop branch:**
      - In the staging environment, click on your backend service
      - Go to **Settings > Source**
      - Change **"Branch"** from `main` to `develop`
      - Save changes

4.  **Set Up the `staging` Netlify Site:**
    - This is the frontend for your `staging` environment. It will be deployed from the `develop` branch.
    - Go to your `llmtxtmastery.com` site in Netlify.
    - Go to **Site configuration > Build & deploy > Continuous Deployment**.
    - Under "Branches and deploy contexts," click **"Configure"**.
    - Select **"Let me add individual branches"** and add `develop`.
    - This creates a `develop--llmtxtmastery.netlify.app` site. This is your **staging frontend URL**.

5.  **Configure Environment Variables:**
    - **Why:** Each environment needs to know how to connect to its corresponding backend and database.

    **Railway Staging Environment:**
    - Go to your Railway project → `staging` environment → Service → **Variables** tab
    - Add these variables:
      - `DATABASE_URL`: Connection string from staging Supabase (must include `?sslmode=require`)
      - `SUPABASE_URL`: Your staging Supabase project URL
      - `SUPABASE_ANON_KEY`: Anon key from staging Supabase
      - `SUPABASE_SERVICE_ROLE_KEY`: Service role key from staging Supabase
      - `FRONTEND_URL`: Your Netlify branch deploy URL (e.g., `https://develop--llmtxtmastery.netlify.app`)
    - Click **"Redeploy"** to apply changes

    **Netlify Branch Deploy:**
    - Go to **Site configuration > Environment variables**
    - Click **"Add a variable"** and select **"Scopes"**
    - For the `develop` branch, add:
      - `VITE_API_URL`: Your staging Railway URL (e.g., `https://llmtxtmastery-staging.up.railway.app`)
      - `VITE_SUPABASE_URL`: Your staging Supabase project URL
      - `VITE_SUPABASE_ANON_KEY`: Anon key from staging Supabase
    - Scope each variable to **"develop" branch only**
    - **Note:** You may need to trigger a manual redeploy from **Deploys** tab if variables don't apply immediately

6.  **Fix CORS for Branch Deploys:**
    - **Why:** By default, your backend only allows requests from your production domain. Netlify branch deploys use different URLs and will be blocked.

    **Update Security Middleware:**
    - Open `server/middleware/security.ts` in your editor
    - Find the CORS origin configuration (usually in a function or array)
    - Add this check to allow Netlify preview domains:
      ```typescript
      // Existing CORS configuration
      const allowedOrigins = [
        'https://llmtxtmastery.com',
        process.env.FRONTEND_URL, // Your configured frontend URL
      ];

      // Add Netlify branch deploy support
      const isNetlifyPreview = (origin: string) => {
        return origin.includes('netlify.app');
      };

      // In your CORS configuration
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || isNetlifyPreview(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
      ```
    - Commit and push this change to the `develop` branch
    - This will automatically redeploy your staging Railway backend

7.  **Centralize Your Secrets (Simplified):**
    - Create a secure note on your Mac. List out the following variables.
    - **Production Secrets:**
      - `NETLIFY_SITE_ID_PROD`
      - `RAILWAY_PROJECT_ID_PROD`
      - `SUPABASE_PROJECT_ID_PROD`
      - `SUPABASE_URL_PROD`
      - `SUPABASE_ANON_KEY_PROD`
      - `SUPABASE_SERVICE_ROLE_KEY_PROD`
      - `RESEND_API_KEY`: (Your one production key)
    - **Staging Secrets:**
      - `SUPABASE_PROJECT_ID_STAGING`
      - `SUPABASE_URL_STAGING`
      - `SUPABASE_ANON_KEY_STAGING`
      - `SUPABASE_SERVICE_ROLE_KEY_STAGING`
    - **Update Environment Variables:**
      - In **Netlify**, update the `develop` branch context with the staging Supabase keys.
      - In **Railway**, update the `staging` environment with the staging Supabase keys. Use the same production `RESEND_API_KEY` but add a new variable like `EMAIL_SUBJECT_PREFIX: "[TEST] "`. Your backend code should use this prefix for all emails sent from the staging environment.
      - In **GitHub Actions Secrets**, add all the secrets listed above.

---

### Phase 2: The Automation Engine (GitHub Actions)

**Objective:** Automate testing and deployment.

1.  **Create the `test-and-deploy.yml` Workflow:**
    - In your project's root, create `.github/workflows/test-and-deploy.yml`.
    - **Copy and paste this code:**

      ```yaml
      name: 'Test and Deploy'
      on:
        push:
          branches: [develop, main]
        pull_request:
          branches: [develop, main]

      jobs:
        test:
          name: 'Run All Tests'
          if: github.event_name == 'pull_request'
          runs-on: ubuntu-latest
          steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                node-version: '20'
            - run: npm ci
            - run: npm run lint
            - run: npm run test:unit
            - run: npx playwright install --with-deps
            - name: 'Wait for Netlify Preview'
              id: netlify
              uses: josephduffy/wait-for-netlify-action@v1
              with:
                site_name: 'your-netlify-site-name'
                max_timeout: 60
            - name: 'Run Playwright Tests'
              run: npx playwright test
              env:
                PLAYWRIGHT_TEST_BASE_URL: ${{ steps.netlify.outputs.url }}
                SUPABASE_URL: ${{ secrets.SUPABASE_URL_STAGING }}
                SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY_STAGING }}

        deploy:
          name: 'Deploy to Environment'
          if: github.event_name == 'push'
          runs-on: ubuntu-latest
          needs: test # This job won't run on push, but shows dependency
          steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                node-version: '20'
            - run: npm install -g supabase @railway/cli

            - name: 'Deploy to Staging'
              if: github.ref == 'refs/heads/develop'
              run: |
                echo "Deploying to Staging..."
                supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_ID_STAGING }}
                railway up --service backend --environment staging --detach
              env:
                SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
                RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

            - name: 'Deploy to Production or Hotfix'
              if: github.ref == 'refs/heads/main'
              run: |
                echo "Deploying to Production..."
                supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_ID_PROD }}
                railway up --service backend --environment production --detach
              env:
                SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
                RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
      ```

2.  **Protect Your `main` Branch:**
    - In GitHub **Settings > Branches**, add a protection rule for `main`.
    - Check **"Require a pull request before merging"**.
    - Check **"Require status checks to pass before merging"** and select the `Run All Tests` job.

---

### Phase 3: Database & Emergency Procedures

**Objective:** Handle database changes safely and know how to roll back.

1.  **Safe Supabase Migrations:**
    - **Step 1: Create Migration Locally:** When you need to change the database schema, run this command. It compares your local Supabase instance to the last migration and creates a new SQL file.
      ```bash
      supabase migration new your_migration_name
      ```
    - **Step 2: Test Locally:** Apply the migration to your local Supabase instance.
      ```bash
      supabase db reset # Resets local DB and applies all migrations
      ```
    - **Step 3: Commit and Push:** Add the new migration file to your Git commit. The CI/CD pipeline will handle applying it to the staging and production databases automatically.

2.  **Emergency Database Rollback (Manual):**
    - **Why:** Use this if a bad migration corrupts your production data.
    - **Action:**
      1.  Go to your **Supabase Production Project**.
      2.  Navigate to **Database > Backups**.
      3.  Find the last known good backup (before the bad deployment).
      4.  Click **"Restore"**. This will take your database back to that point in time.
      5.  **CRITICAL:** You must immediately fix the faulty migration code and deploy a corrected version.

3.  **Emergency Application Rollback:**
    - **Why:** Use this if a deployment introduces a critical bug.
    - **Netlify (Frontend):**
      1.  Go to your production site's **Deploys** tab.
      2.  Find the last successful deploy before the bad one.
      3.  Click on it and select **"Publish deploy"**. This instantly rolls back the frontend.
    - **Railway (Backend):**
      1.  Go to your production service's **Deployments** tab.
      2.  Find the last successful deployment.
      3.  Click the three dots (...) and select **"Redeploy"**. This rolls back the backend to that version.
    - **After Rollback:** Immediately create a hotfix branch to properly fix the bug.
