# Railway Deployment Fix

## Issue
The Railway backend at https://llm-txt-mastery-production.up.railway.app was returning HTML for API routes instead of JSON responses. The frontend was experiencing infinite loops during analysis with "looping on generating ai powered descriptions" errors.

## Root Cause
The frontend code uses `import.meta.env.VITE_API_URL` to determine where to send API requests. When this environment variable is not set, the frontend defaults to using relative URLs (`const baseUrl = import.meta.env.VITE_API_URL || '';`). 

In a deployment where the frontend and backend are hosted separately (e.g., frontend on CDN, backend on Railway), relative URLs don't work because they don't point to the Railway backend.

## Solution
Set the `VITE_API_URL` environment variable in Railway to point to the backend URL.

### Steps to Fix

1. **Set Railway Environment Variable**
   - Go to Railway dashboard for the llm-txt-mastery project
   - Navigate to Variables section
   - Add: `VITE_API_URL=https://llm-txt-mastery-production.up.railway.app`

2. **Redeploy Application**
   - The frontend needs to be rebuilt with the new environment variable
   - Trigger a new deployment in Railway

### Environment Variables Required for Production

Backend (Railway):
```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-proj-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_API_URL=https://llm-txt-mastery-production.up.railway.app
```

Frontend (built with Vite):
```
VITE_API_URL=https://llm-txt-mastery-production.up.railway.app
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Verification
After setting the environment variable and redeploying:

1. **Test Health Endpoint**
   ```bash
   curl https://llm-txt-mastery-production.up.railway.app/health
   ```
   Should return: `{"status":"ok","timestamp":"...","message":"Railway backend is running"}`

2. **Test API Endpoint**
   ```bash
   curl -H "Content-Type: application/json" \
        -X POST \
        https://llm-txt-mastery-production.up.railway.app/api/email-capture \
        -d '{"email":"test@example.com","websiteUrl":"https://example.com","tier":"starter"}'
   ```
   Should return JSON response, not HTML.

3. **Test Frontend**
   - Visit the application
   - Try analyzing a website
   - Should work without infinite loops

## Related Files
- `client/src/lib/queryClient.ts` - Contains the API request logic
- `.env.example` - Updated to document VITE_API_URL requirement
- `railway.toml` - Railway deployment configuration

## Prevention
Always ensure `VITE_API_URL` is set for production deployments where frontend and backend are hosted separately.