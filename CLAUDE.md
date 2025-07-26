# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Production Architecture: Railway + Netlify Split Deployment

**Frontend**: Netlify (www.llmtxtmastery.com) - React app with static hosting  
**Backend**: Railway (api.llmtxtmastery.com) - Express.js API with PostgreSQL  
**Integration**: Frontend calls Railway API via CORS-enabled endpoints

## Common Development Commands

### Local Development
- `npm run dev` - Start development server (runs both frontend and backend on port 5000)
- `npm run build` - Build for production (builds frontend with Vite and backend with ESBuild)
- `npm start` - Start production server locally
- `npm run check` - Run TypeScript type checking

### Database Management
- `npm run db:push` - Push database schema changes using Drizzle Kit
- `npm run migrate` - Run database migrations

## Project Architecture

### Overview
LLM.txt Mastery is a full-stack TypeScript application that analyzes websites and generates optimized `llms.txt` files for AI systems. The application uses a monorepo structure with shared schemas and follows a freemium model with AI-enhanced analysis for premium users.

### Core Architecture
- **Frontend**: React 18 with TypeScript, Tailwind CSS, shadcn/ui components (Deployed on Netlify)
- **Backend**: Express.js with TypeScript, PostgreSQL with Drizzle ORM (Deployed on Railway)
- **Shared**: Common schemas and types in `shared/schema.ts`
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations (Railway managed)
- **Integration**: CORS-enabled API calls from Netlify frontend to Railway backend

### Key Directories
- `client/` - React frontend application
- `server/` - Express.js backend with API routes and services
- `shared/` - Shared TypeScript schemas and types
- `server/services/` - Business logic (OpenAI integration, sitemap parsing)

### Main Application Flow
1. **URL Input**: User enters website URL for analysis
2. **Email Capture**: Freemium model with tier selection (free vs premium)
3. **Website Analysis**: Multi-strategy sitemap discovery and content analysis
4. **Content Review**: AI-powered quality scoring and page selection
5. **File Generation**: Standards-compliant LLM.txt file creation

### Database Schema
- `sitemapAnalysis` - Stores website analysis results and discovered pages
- `llmTextFiles` - Generated LLM.txt files with selected pages
- `emailCaptures` - User email captures for freemium model
- `users` - User authentication (minimal implementation)

### Key Services
- **Sitemap Service** (`server/services/sitemap.ts`): Multi-strategy sitemap discovery with 7+ fallback methods
- **OpenAI Service** (`server/services/openai.ts`): AI-powered content analysis and quality scoring
- **Storage Service** (`server/storage.ts`): Database operations using Drizzle ORM

### Environment Variables

#### Frontend (Netlify)
- `VITE_API_URL` - Railway backend URL (e.g., https://api.llmtxtmastery.com)
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

#### Backend (Railway)
- `DATABASE_URL` - PostgreSQL connection string (Railway managed)
- `OPENAI_API_KEY` - OpenAI API key for AI-enhanced analysis
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `STRIPE_LLM_TXT_COFFEE_PRICE_ID` - Coffee tier price ID
- `STRIPE_LLM_TXT_GROWTH_PRICE_ID` - Growth tier price ID
- `STRIPE_LLM_TXT_SCALE_PRICE_ID` - Scale tier price ID
- Plus 20+ additional environment variables for full functionality

### Important Technical Details
- Uses Drizzle ORM with PostgreSQL for type-safe database operations
- Implements comprehensive sitemap discovery with fallback strategies
- Supports both HTML extraction (free) and AI-enhanced analysis (premium)
- Limits analysis to 200 pages for performance optimization
- Uses batch processing for content analysis to avoid rate limits
- Implements bot protection detection with consecutive failure tracking

### API Endpoints (Railway Backend)
- `POST /api/analyze` - Analyze website and discover pages (real analysis, not mock)
- `GET /api/analysis/:id` - Get analysis status and results
- `POST /api/generate-llm-file` - Generate LLM.txt file from selected pages
- `GET /api/download/:id` - Download generated LLM.txt file
- `POST /api/email-capture` - Capture user email for freemium model
- `POST /api/stripe/create-checkout` - Create Stripe checkout sessions
- `POST /api/stripe/webhook` - Handle Stripe webhooks
- `GET /api/health` - Health check endpoint

### Development Notes

#### Local Development
- The application runs on port 5000 for local development
- Frontend and backend are served from the same Express server locally
- Uses Vite for frontend development with hot reloading
- TypeScript is used throughout with strict type checking

#### Production Deployment
- **Frontend**: Netlify auto-deploys from GitHub (client/ directory)
- **Backend**: Railway auto-deploys from GitHub (server/ directory)
- **Database**: Railway managed PostgreSQL with connection pooling
- **CORS**: Backend configured to allow requests from Netlify domain
- **Environment**: Variables split between platforms based on usage

#### Database Management
- Database migrations are handled through Drizzle Kit
- Railway provides connection string via DATABASE_URL
- Connection pooling enabled for production performance

## Deployment Lessons Learned

### Critical Production Issues Resolved

1. **Express.js vs Serverless Mismatch**
   - Issue: App built as monolithic Express.js but deployed as serverless functions
   - Solution: Split to Railway (backend) + Netlify (frontend) architecture
   - Learning: Match deployment strategy to application architecture from start

2. **Import.meta.dirname Bundling Failures**
   - Issue: `import.meta.dirname` caused Railway deployment crashes
   - Solution: Replace with `process.cwd()` and dynamic imports
   - Learning: Test production bundling early with ES modules

3. **Database Driver Compatibility**
   - Issue: Neon WebSocket driver incompatible with Railway PostgreSQL
   - Solution: Switch to standard `pg` driver with `drizzle-orm/node-postgres`
   - Learning: Verify database drivers work with deployment platform

4. **Frontend API Communication**
   - Issue: Relative URLs pointed to wrong endpoints after split
   - Solution: Implement `VITE_API_URL` for all API calls
   - Learning: Environment-based API URLs essential for split architectures

5. **CORS and Trust Proxy Configuration**
   - Issue: Cross-origin requests blocked, rate limiting failed
   - Solution: Add CORS middleware + `app.set('trust proxy', true)`
   - Learning: Railway requires trust proxy for proper request handling

### Customer Journey Issues (Current)

**Problem**: Coffee tier purchasers still see tier selection after payment
**Root Cause**: Missing URL preservation and tier detection in post-payment flow
**Status**: Actively being fixed

## Common Troubleshooting

### Railway Backend Issues
- Check deployment logs in Railway dashboard
- Verify environment variables are set correctly
- Ensure DATABASE_URL connects to Railway PostgreSQL
- Test health endpoint: `curl https://llm-txt-mastery-production.up.railway.app/health`

### Netlify Frontend Issues  
- Check build logs in Netlify dashboard
- Verify VITE_API_URL points to Railway backend
- Test CORS by checking browser network tab
- Ensure build command uses `npm run build`

### Database Connection Issues
- Run `npm run db:push` with Railway DATABASE_URL
- Check if tables exist in Railway PostgreSQL dashboard
- Verify Drizzle schema matches database structure

### Stripe Payment Issues
- Check webhook endpoint in Stripe dashboard
- Verify webhook secret matches STRIPE_WEBHOOK_SECRET
- Test payment flow in Stripe test mode first