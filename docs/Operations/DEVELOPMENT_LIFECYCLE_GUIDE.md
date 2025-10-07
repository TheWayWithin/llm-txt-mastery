# The Solo Developer's Lifecycle Guide

**Why this exists:** To give you a simple, repeatable process for shipping code safely, so you can focus on building, not fixing.

---

### The Core Idea: Two Branches, Three Environments

This workflow separates your code into branches and your live servers into environments.

1.  **`main` branch:** This is your **Production Code**. It's sacred. Only code that has been tested and works goes here.
2.  **`develop` branch:** This is your **Staging Code**. It's a container for all your "in-progress" but completed features.
3.  **Feature branches (`feature/add-new-button`):** These are temporary. You do all your work here. They get deleted after they're merged.

The branches deploy to corresponding environments:

| Environment    | Deployed From Branch | URL               | Database               | Purpose                                          |
| :------------- | :------------------- | :---------------- | :--------------------- | :----------------------------------------------- |
| **Production** | `main`               | `app.com`         | Production DB          | **Live user traffic.**                           |
| **Staging**    | `develop`            | `develop.app.com` | Staging DB             | **Final checks before release.**                 |
| **Preview**    | `feature/...`        | `pr-123.app.com`  | Staging DB (read-only) | **Automated & manual testing of a specific PR.** |

**Key Clarification:** The `develop` branch contains the code. The `staging` environment is the live server that runs the code from the `develop` branch. They are two sides of the same coin.

---

### The Daily Workflow: Feature Development

1.  **Start Work:**
    - **Action:** Create a new branch from `develop`.
    - **Example:** `git checkout -b feature/user-profile`
    - **Why:** This isolates your work. You can't break anything.

2.  **Build & Commit:**
    - **Action:** Write your code in VS Code. Make small, frequent commits.
    - **Example:** `git commit -m "feat: add avatar upload button"`
    - **Why:** Small commits are easier to undo if something goes wrong.

3.  **Test (The Automated Part):**
    - **Action:** Push your branch and open a Pull Request (PR) to `develop`.
    - **What Happens:** GitHub Actions automatically:
      1.  Deploys your changes to a unique **Preview URL**.
      2.  Runs your Playwright tests against that URL.
      3.  Shows a **green check ✅** or **red cross ❌** on the PR.
    - **Why:** You know _before_ merging if your change breaks anything. No more "testing in production."

4.  **Deploy to Staging:**
    - **Action:** If the checks are green, click **"Merge pull request"**.
    - **What Happens:** Your changes are now in the `develop` branch. GitHub Actions automatically deploys this branch to your **Staging Environment**.
    - **Why:** This gives you a stable place to see how all new features work together before they go live.

5.  **Release to Production:**
    - **Action:** When you're ready to release, open a new PR from `develop` to `main`.
    - **What Happens:** Tests run one last time. When you merge this PR, the code from `main` is automatically deployed to your **Production Environment**.
    - **Why:** This is your formal, safe, and automated release process.

---

### The Emergency Workflow: Production Hotfix

**When to use:** A critical bug is live and needs to be fixed _now_.

1.  **Create Hotfix Branch:** Create a branch directly from `main`.
    - **Example:** `git checkout -b hotfix/fix-login-error`

2.  **Fix and PR to `main`:** Fix the bug and open a Pull Request directly back to `main`.

3.  **Automated Test & Deploy:** The same automated tests will run. When you merge, the fix goes live to the production environment immediately.

4.  **CRITICAL FINAL STEP:** You **must** also merge this fix back into `develop` to keep the branches in sync.
    - **Action:** Open a new PR from your `hotfix/fix-login-error` branch into `develop` and merge it.
