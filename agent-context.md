# Agent Context - DevOps Lifecycle Implementation Mission

## Previous Mission: Landing Page Optimization ✅

**Status**: Strategic analysis complete, awaiting Week 1 implementation

---

## Current Mission: DevOps Lifecycle Implementation 🎯

### Mission Objectives

1. ✅ Review and ratify DevOps implementation plan
2. ⏳ Update project-plan.md with new mission breakdown
3. ⏳ Execute Phase 0: Pre-commit guardrails (ESLint, Prettier, Vitest)
4. ⏳ Execute Phase 1: Environment setup (develop branch, staging infrastructure)
5. ⏳ Execute Phase 2: GitHub Actions automation (CI/CD pipeline)
6. ⏳ Execute Phase 3: Database migrations & emergency procedures

## Mission Status: PLANNING → EXECUTION ⏳

**Start Date**: October 6, 2025
**Mission Owner**: THE OPERATOR
**User Constraints**: Basic GitHub knowledge, ADHD-friendly (step-by-step only)

## Key Context Documents

- **Implementation Plan**: `/docs/Operations/DEVOPS-IMPLEMENTATION_PLAN.md` (detailed 3-phase rollout)
- **Workflow Guide**: `/docs/Operations/DEVELOPMENT_LIFECYCLE_GUIDE.md` (conceptual framework)
- **Current Project Plan**: `/project-plan.md` (needs new DevOps mission added)

## DevOps Workflow Design

### Branch Strategy

- **`main`** → Production environment (sacred, tested code only)
- **`develop`** → Staging environment (in-progress but completed features)
- **`feature/*`** → Preview environments (temporary work branches, auto-deleted after merge)

### Environment Mapping

| Environment    | Deployed From | URL Pattern                        | Database               | Purpose                     |
| -------------- | ------------- | ---------------------------------- | ---------------------- | --------------------------- |
| **Production** | `main`        | llmtxtmastery.com                  | Production DB          | Live user traffic           |
| **Staging**    | `develop`     | develop--llmtxtmastery.netlify.app | Staging DB             | Final checks before release |
| **Preview**    | `feature/*`   | pr-123--llmtxtmastery.netlify.app  | Staging DB (read-only) | PR testing                  |

### Tech Stack

- **Frontend**: Netlify (React/TypeScript)
- **Backend**: Railway (Express.js/Node.js)
- **Database**: Supabase (PostgreSQL via Neon)
- **CI/CD**: GitHub Actions
- **Testing**: Playwright (E2E), Vitest (unit tests)
- **Linting**: ESLint + Prettier

## Implementation Phases

### Phase 0: Pre-Commit Guardrails (Local Setup)

**Objective**: Catch errors before commits
**Tasks**:

- Install ESLint, Prettier, Vitest
- Configure linting and formatting rules
- Add npm scripts for lint/format/test
- Establish pre-push habit

### Phase 1: Foundational Setup (Environments & Secrets)

**Objective**: Create staging and production separation
**Tasks**:

- Create `develop` branch from `main`
- Set up staging Supabase project (replicate schema)
- Set up staging Railway environment
- Set up staging Netlify deployment
- Centralize and document all secrets
- Configure environment variables in all platforms

### Phase 2: Automation Engine (GitHub Actions)

**Objective**: Automated testing and deployment
**Tasks**:

- Create `.github/workflows/test-and-deploy.yml`
- Configure automated testing on PRs (Playwright + Vitest)
- Set up automated deployment on merge
- Add branch protection rules for `main`
- Require passing tests before merge

### Phase 3: Database & Emergency Procedures

**Objective**: Safe migrations and rollback capability
**Tasks**:

- Document Supabase migration workflow
- Set up emergency database rollback procedure
- Document frontend rollback (Netlify)
- Document backend rollback (Railway)
- Create hotfix workflow documentation

## Critical Requirements

### User Constraints

- **Knowledge Level**: Basic GitHub (can commit/push, needs step-by-step CLI guidance)
- **ADHD**: Requires ONE task at a time, no overwhelming lists
- **Preference**: See progress frequently, mark tasks complete often
- **Communication**: Explain commands before running, provide copy-paste ready syntax

### Security & Best Practices

- Follow Critical Software Development Principles (CLAUDE.md)
- Never compromise security for convenience
- Root cause analysis before implementing fixes
- Test each step before proceeding to next
- Branch protection on `main` (require PR + passing tests)
- All database migrations tested in staging first

### Daily Workflow (After Implementation)

1. Create feature branch from `develop`
2. Build and commit code locally
3. Push and open PR to `develop` (triggers automated tests + preview deploy)
4. Merge to `develop` when tests pass (auto-deploys to staging)
5. Open PR from `develop` to `main` for production release
6. Merge to `main` when ready (auto-deploys to production)

### Emergency Workflow (Hotfixes)

1. Create `hotfix/*` branch from `main`
2. Fix bug and open PR to `main`
3. Merge and deploy to production immediately
4. **CRITICAL**: Also merge hotfix into `develop` to keep branches in sync

## Mission Status Summary

**Plan Ratification**: ✅ APPROVED - Well-designed, comprehensive, ADHD-friendly
**Current Phase**: Delegating to THE OPERATOR for project-plan.md update and Phase 0 start
**Next Phase**: Phase 0 execution (pre-commit guardrails)
**Estimated Total Duration**: 3-4 days across all phases
**User Availability**: Step-by-step, one task at a time

---

**Last Updated**: October 6, 2025 by THE COORDINATOR
