# Production Deploy Checklist

**Pre-Deploy (Before merging to main):**

- [ ] All tests pass on staging
- [ ] Fake stats removed ✅ (done 2026-02-03)
- [ ] OpenRouter migration ready (needs env vars)
- [ ] Stripe in live mode (verify)
- [ ] Email verification working
- [ ] Free tier scan working
- [ ] Paid tier checkout working

**Environment Variables (Railway Production):**

| Variable | Status | Notes |
|----------|--------|-------|
| `DATABASE_URL` | ✅ | Existing |
| `STRIPE_SECRET_KEY` | ✅ | Live mode key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Production webhook |
| `OPENROUTER_API_KEY` | ⏳ | Need to create |
| `LLM_MODEL` | ⏳ | Set to `openai/gpt-4o-mini` |
| `OPENAI_API_KEY` | ✅ | Keep for embeddings |
| `RESEND_API_KEY` | ✅ | For emails |
| `FRONTEND_URL` | ✅ | `https://llmtxtmastery.com` |

**Post-Deploy Verification:**

- [ ] Homepage loads
- [ ] Free scan works end-to-end
- [ ] Signup flow works
- [ ] Stripe checkout works (test with $1)
- [ ] Email verification sends
- [ ] llms.txt generation works

**Rollback Plan:**

If something breaks:
1. Railway → Deployments → Previous → Redeploy
2. Or: `git revert HEAD && git push`

---

**Current Pending Commits (develop → main):**

1. `Replace fake stats with honest early-stage messaging`
2. `Add outreach tracking system for A/B testing`
3. `fix(ci): upgrade to Node 20, adjust audit level` ⚠️ needs workflow scope
4. `feat: migrate to OpenRouter for LLM calls` ⚠️ needs env vars
5. `feat: add simple outreach helper script`

---

*Last updated: 2026-02-03*
