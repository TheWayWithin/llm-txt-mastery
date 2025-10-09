# Mission: OpsDev Development Lifecycle Setup

**Mission Type**: Infrastructure
**Estimated Time**: 2-4 hours (first-time setup)
**Complexity**: Medium
**Prerequisites**: Production environment operational, platform access confirmed

## Objective

Set up or maintain standardized development lifecycle with staging environment, automated deployments, and safe release workflow following the opsdev methodology.

## Reference Documentation

- **Primary Guide**: `/docs/Operations/DEVOPS-IMPLEMENTATION_PLAN.md`
- **Daily Workflow**: `/docs/Operations/DEVELOPMENT_LIFECYCLE_GUIDE.md`
- **Architecture**: `/architecture.md` (must match production)

## Mission Phases

### Phase 0: Pre-Flight Validation (15 minutes)
**Specialist**: architect or operator

**Tasks**:
- [ ] Read architecture.md completely
- [ ] Verify production infrastructure documented correctly
- [ ] Document all production environment variables
- [ ] Confirm access to all platform dashboards (Railway, Netlify, database)
- [ ] Identify production database provider (Neon, Supabase, etc.)
- [ ] Note production URLs (frontend, backend, database)

**Deliverable**: Pre-flight checklist completed, production state documented

### Phase 1: Staging Environment Setup (1-2 hours)
**Specialist**: operator

**Tasks**:
- [ ] Create develop branch from main
- [ ] Set develop as default branch in GitHub
- [ ] Create staging database (SAME provider as production)
- [ ] Export production schema, clean for compatibility
- [ ] Import schema to staging database
- [ ] Create Railway staging environment (duplicate production)
- [ ] Configure Netlify branch deploy for develop
- [ ] Set all environment variables (backend and frontend)
- [ ] Add CORS support for Netlify preview URLs
- [ ] Trigger manual redeploys after variable changes

**Deliverable**: Staging environment fully functional, mirrors production

**Critical Checks**:
- ✅ Database provider matches production
- ✅ All environment variables set correctly
- ✅ `?sslmode=require` added to DATABASE_URL
- ✅ CORS allows preview URL pattern
- ✅ Staging URLs documented

### Phase 2: Workflow Integration (30 minutes)
**Specialist**: operator or documenter

**Tasks**:
- [ ] Update architecture.md with staging URLs
- [ ] Document branch strategy in project documentation
- [ ] Update CLAUDE.md if project-specific opsdev notes needed
- [ ] Create quick reference card for team

**Deliverable**: Documentation updated, workflow documented

### Phase 3: End-to-End Verification (30 minutes)
**Specialist**: tester

**Tasks**:
- [ ] Create test feature branch from develop
- [ ] Make trivial change (e.g., add comment)
- [ ] Push branch, verify PR preview URL created
- [ ] Open PR to develop
- [ ] Merge PR, verify staging auto-deploys
- [ ] Test staging environment end-to-end
- [ ] Create PR from develop to main
- [ ] Merge to main, verify production deploys
- [ ] Verify no regressions in production

**Deliverable**: Complete workflow tested and verified

## Success Criteria

- ✅ develop branch auto-deploys to staging on merge
- ✅ Feature branches create preview URLs automatically
- ✅ CORS allows all Netlify preview URLs
- ✅ Database connections work on staging
- ✅ Environment variables apply correctly
- ✅ End-to-end test PR completes successfully
- ✅ Production deployment workflow verified
- ✅ Documentation updated with all URLs
- ✅ Team can follow workflow independently

## Common Issues & Solutions

**Issue 1: CORS Blocking Preview URLs**
- Symptom: "Blocked by CORS policy" in browser console
- Solution: Update `server/middleware/security.ts` with Netlify pattern
- Code: Add `/https:\/\/.*--[sitename]\.netlify\.app$/` to allowedOrigins

**Issue 2: Database Connection Errors**
- Symptom: "SSL required" or "connection refused"
- Solution: Add `?sslmode=require` to DATABASE_URL
- Apply: Railway Variables tab → Update → Redeploy

**Issue 3: Environment Variables Not Applying**
- Symptom: Old values still in use after changes
- Railway: Variables tab → Redeploy service
- Netlify: Deploys tab → Trigger deploy → Clear cache
- Wait: 2-3 minutes for deployment

**Issue 4: Railway Environment Creation**
- Symptom: CLI `environment add` doesn't work
- Solution: Use Dashboard → Duplicate Environment (NOT Empty)
- Benefit: Copies all services and configuration automatically

## Rollback Plan

If staging environment causes issues:
1. Revert CORS changes (if affecting production)
2. Delete staging Railway environment
3. Delete staging database
4. Remove develop branch deploy from Netlify
5. Document issues for future attempt

## Post-Mission Maintenance

**Weekly**:
- Verify staging environment health
- Check for environment variable drift
- Test deployment workflow

**Monthly**:
- Sync staging database schema with production
- Review and update documentation
- Validate CORS patterns still work

**As Needed**:
- Update opsdev workflow for new services
- Add new preview URL patterns
- Document new troubleshooting procedures

## Handoff to Team

After setup complete:
1. Share DEVELOPMENT_LIFECYCLE_GUIDE.md with team
2. Demonstrate branch → PR → staging → production flow
3. Review common issues section
4. Ensure everyone has platform access
5. Schedule first team deployment with new workflow

---

**Remember**: The opsdev workflow saves hours of debugging by ensuring staging mirrors production. Take the time to set it up correctly once, reap benefits forever.
