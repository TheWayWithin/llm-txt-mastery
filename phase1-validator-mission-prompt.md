# Phase 1 Validator Implementation - Mission Prompt

## Mission Objective

Implement complete llms.txt validation logic to replace mock responses in `/server/services/validation.ts`. The Phase 2 infrastructure (API endpoints, rate limiting, database) is already deployed to production, but the core validation logic returns fake data.

---

## Critical Context

### Current State
- ✅ Phase 2 infrastructure deployed (database, API endpoints, rate limiting)
- ❌ Validation service returns MOCK data (fake scores, always 75/100)
- ❌ Feature appears working but provides zero real value
- ❌ Production API endpoint active but useless to customers

### Root Cause
Phase 2 (infrastructure) was implemented before Phase 1 (validation logic). This is a violation of Critical Software Development Principles - shipping incomplete features.

### Impact
- BLOCKING: Cannot perform real UAT testing
- BLOCKING: Feature has zero production value
- RISK: Users could discover fake validation scores
- DEBT: Infrastructure exists but core logic missing

---

## Implementation Requirements

### Phase 1A: Validation Logic Core (2 days)

**File to Modify**: `/server/services/validation.ts`

**Tasks**:
1. Fetch llms.txt file from URL
   - Handle HTTP/HTTPS
   - Follow redirects (max 5)
   - Timeout after 10 seconds
   - Handle 404, 500, network errors

2. Parse markdown structure
   - Extract sections (# Overview, # Policies, # Custom Sections)
   - Parse URLs from markdown links
   - Extract metadata fields
   - Validate markdown syntax

3. Implement validation rules engine
   - Required sections check (# Overview, # Policies)
   - URL format validation (valid protocols, domains)
   - URL accessibility check (HEAD request)
   - Markdown syntax compliance
   - Content completeness scoring

**Expected Functions to Implement**:
```typescript
async function fetchLlmsTxt(url: string): Promise<string>
async function parseLlmsTxt(content: string): ParsedLlmsTxt
async function validateStructure(parsed: ParsedLlmsTxt): ValidationResult[]
async function validateUrls(urls: string[]): UrlValidationResult[]
function calculateScore(validationResults: ValidationResult[]): number
function generateRecommendations(validationResults: ValidationResult[]): string[]
```

---

### Phase 1B: Scoring System (1 day)

**Scoring Algorithm** (0-100 scale):
- Required sections present: 30 points (15 per section)
- URL validity: 25 points (5 points per valid URL, up to 5 URLs)
- Markdown syntax: 20 points
- Content completeness: 15 points (description quality, detail level)
- Robots.txt compatibility: 10 points (bonus)

**Severity Classification**:
- CRITICAL: Missing required sections, broken URLs
- WARNING: Syntax issues, incomplete descriptions
- INFO: Optimization suggestions, best practices

**Deliverable**:
- Scoring function that returns 0-100
- Recommendations array with actionable items
- Issue severity classification

---

### Phase 1C: Robots.txt Integration (1 day)

**Tasks**:
1. Fetch robots.txt from same domain as llms.txt
   - URL pattern: `{domain}/robots.txt`
   - Handle 404 gracefully (not all sites have robots.txt)

2. Parse robots.txt rules
   - Extract User-agent directives
   - Extract Disallow paths
   - Extract Allow paths
   - Identify AI crawler references

3. Detect conflicts
   - Check if llms.txt URLs conflict with Disallow rules
   - Check for inconsistent AI crawler policies
   - Identify missing AI crawler directives

4. Generate recommendations
   - Suggest robots.txt updates if conflicts found
   - Recommend adding AI crawler rules
   - Provide example robots.txt syntax

**Expected Functions**:
```typescript
async function fetchRobotsTxt(domain: string): Promise<string | null>
function parseRobotsTxt(content: string): RobotsTxtRules
function detectConflicts(llmsTxt: ParsedLlmsTxt, robotsTxt: RobotsTxtRules): Conflict[]
function generateRobotsTxtRecommendations(conflicts: Conflict[]): string[]
```

---

### Phase 1D: Testing & Validation (1 day)

**Test Suite Requirements**:

1. **Unit Tests** (target: 95% coverage)
   - Test each validation rule individually
   - Test scoring algorithm with known inputs
   - Test robots.txt parsing edge cases
   - Test error handling (timeouts, 404s, malformed content)

2. **Integration Tests**
   - Test full validation flow end-to-end
   - Test with real llms.txt examples
   - Test with Phase 2 API endpoints
   - Verify database storage working

3. **Test Data**
   - Valid llms.txt example (should score 90-100)
   - Invalid llms.txt example (should score <50)
   - Missing sections (should identify)
   - Broken URLs (should detect)
   - Robots.txt conflicts (should warn)

**Test Locations**:
- Unit tests: `/server/services/__tests__/validation.test.ts`
- Integration tests: `/tests/integration/validation-api.test.ts`

---

### Phase 1E: Deployment (0.5 days)

**Deployment Steps**:
1. Deploy to staging environment
2. Test with real llms.txt URLs
3. Verify performance (<35s p95)
4. Check API response format matches Phase 2 contract
5. Deploy to production
6. Monitor error rates and response times

**Success Criteria**:
- ✅ Real validation logic replaces all mock responses
- ✅ Validation scores accurate and meaningful
- ✅ Robots.txt conflict detection working
- ✅ Processing time < 35 seconds (p95)
- ✅ Unit test coverage > 95%
- ✅ Integration tests passing
- ✅ Zero breaking changes to Phase 2 API contract
- ✅ Production deployment successful

---

## Reference Documents

### Key Files to Understand
1. `/validator-plan-enhancements.md` - Comprehensive implementation plan
2. `/server/services/validation.ts` - Service to implement (currently mock)
3. `/server/routes/validation.ts` - API routes (already functional)
4. `/shared/schema.ts` - Database schema for validation results

### API Contract (MUST NOT BREAK)
The validation service must return this structure:
```typescript
interface ValidationResponse {
  success: boolean;
  cached: boolean;
  data: {
    url: string;
    score: number;  // 0-100
    issues: Array<{
      severity: 'critical' | 'warning' | 'info';
      message: string;
      section?: string;
    }>;
    recommendations: string[];
    robotsTxtConflicts?: Array<{
      path: string;
      rule: string;
      recommendation: string;
    }>;
    timestamp: string;
  };
}
```

---

## Technical Constraints

### Performance Requirements
- P50: < 10 seconds
- P95: < 35 seconds
- P99: < 60 seconds
- Timeout: 60 seconds max

### Dependencies Available
- Node.js fetch API (built-in)
- Markdown parsing: Install `remark` or `marked`
- URL validation: Use Node.js URL class
- Robots.txt parsing: Install `robots-parser` package

### Security Requirements
- Follow Critical Software Development Principles
- No security compromises for convenience
- Validate all external URLs before fetching
- Prevent SSRF attacks (no internal IPs, localhost)
- Rate limit external requests
- Sanitize all user inputs

---

## Implementation Strategy

### Recommended Approach
1. **Start Small**: Implement basic fetch + parse first
2. **Test Early**: Write tests as you implement
3. **Iterate**: Add validation rules incrementally
4. **Validate**: Test with real llms.txt files frequently
5. **Deploy**: Staging → Production with monitoring

### Risk Mitigation
- Keep Phase 2 API contract unchanged
- Use feature flags if needed for gradual rollout
- Monitor error rates closely after deployment
- Have rollback plan ready (revert to mock if critical issues)

---

## Success Validation

### How to Know Phase 1 is Complete

1. **Functional Tests Pass**:
   ```bash
   npm run test
   curl -X POST http://localhost:3001/api/validate-llms-txt \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com/llms.txt"}'
   # Should return real validation, not mock data
   ```

2. **Real Scores Returned**:
   - Test with known good llms.txt → score 80-100
   - Test with known bad llms.txt → score 0-50
   - Test with missing file → proper 404 error

3. **Performance Met**:
   - Run load test: 10 concurrent requests
   - Verify all complete within 35 seconds

4. **Production Validated**:
   - Deploy to production
   - Test live endpoint
   - Monitor CloudWatch/logs for errors
   - Verify no mock responses in logs

---

## Coordinator Instructions

Use this mission prompt with `/coord` to orchestrate the implementation:

```bash
/coord
# When prompted, reference this file: phase1-validator-mission-prompt.md
```

**Recommended Agent Delegation**:
1. THE DEVELOPER: Phases 1A, 1B, 1C (implementation)
2. THE TESTER: Phase 1D (testing & validation)
3. THE OPERATOR: Phase 1E (deployment)

**Estimated Total Time**: 4-5 days with testing

---

## User Actions Required

**Before Starting**:
- ✅ None - coordinator will handle everything

**During Implementation**:
- Review progress updates in project-plan.md
- Approve deployment to staging
- Approve deployment to production

**After Completion**:
- Test validation endpoint manually
- Run UAT tests to validate real functionality
- Monitor production for any issues

---

## Questions for Agents to Answer

If agents have questions, refer them to:
1. `/validator-plan-enhancements.md` for detailed requirements
2. CLAUDE.md for communication guidelines (user has ADHD)
3. Critical Software Development Principles (no shortcuts)

---

## Emergency Rollback Plan

If production issues occur:
1. Identify error in logs
2. Quick fix if obvious (< 1 hour)
3. Otherwise: Deploy previous version
4. Revert commit: `git revert HEAD && git push origin main`
5. Railway auto-deploys previous version
6. Investigate root cause offline

---

**READY TO START**: Copy this entire file content and use with `/coord` after `/clear`
