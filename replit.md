# LLM.txt Mastery - Replit Development Guide

## Overview

LLM.txt Mastery is a web application that automates the creation of llms.txt files for websites, enabling better AI system accessibility and content understanding. The application provides a systematic approach to discovering, analyzing, and generating high-quality llms.txt files through an intelligent AI-assisted workflow.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
The application follows a monorepo structure with clear separation between client and server components:

- **Frontend**: React with TypeScript, located in `/client`
- **Backend**: Express.js with TypeScript, located in `/server`
- **Shared**: Common schemas and types in `/shared`
- **Database**: PostgreSQL with Drizzle ORM
- **Build System**: Vite for frontend, esbuild for backend

### Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI GPT-4o for content analysis
- **Styling**: Tailwind CSS with custom brand variables
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing

## Key Components

### Frontend Architecture
The frontend is built with React and uses a component-based architecture:

- **Main App**: Single-page application with step-based workflow
- **Component Library**: shadcn/ui components for consistent UI
- **Custom Components**: Specialized components for each workflow step
- **Styling**: Tailwind CSS with custom brand colors (Mastery Blue, Innovation Teal)
- **State Management**: TanStack Query for API state, local state for workflow

### Backend Architecture
The backend follows a RESTful API pattern with Express.js:

- **Route Handlers**: Clean separation of concerns with dedicated route files
- **Services**: Business logic separated into service layers
- **Storage**: Abstracted storage interface with in-memory implementation
- **AI Integration**: OpenAI service for content analysis
- **Middleware**: Request logging and error handling

### Database Schema
The application uses Drizzle ORM with PostgreSQL:

- **users**: User management (basic structure)
- **sitemapAnalysis**: Website analysis records with JSON fields for discovered pages
- **llmTextFiles**: Generated LLM.txt files with selected pages and content

## Data Flow

### Content Discovery Workflow
1. **URL Input**: User enters website URL
2. **Sitemap Analysis**: System fetches and parses sitemap.xml
3. **Content Analysis**: AI analyzes each page for quality and relevance
4. **Page Selection**: User reviews and selects pages to include
5. **File Generation**: System generates formatted llms.txt file

### API Endpoints
- `POST /api/analyze`: Initiate website analysis
- `GET /api/analysis/:id`: Check analysis status
- `POST /api/generate-llm-file`: Generate llms.txt file
- `GET /api/llm-file/:id`: Retrieve generated file

### Content Analysis Pipeline
1. **Sitemap Discovery**: Multiple fallback strategies for finding sitemaps
2. **HTML Parsing**: Cheerio-based content extraction
3. **AI Analysis**: OpenAI GPT-4o analyzes content for quality scoring
4. **Quality Metrics**: Systematic scoring based on content value for AI systems

## External Dependencies

### AI Services
- **OpenAI GPT-4o**: Content analysis and quality scoring
- **Configuration**: API key via environment variables
- **Usage**: Structured JSON responses for consistent analysis

### Third-Party Libraries
- **Frontend**: React ecosystem, Radix UI components, TanStack Query
- **Backend**: Express.js, Cheerio for HTML parsing, xml2js for sitemap parsing
- **Database**: Drizzle ORM, @neondatabase/serverless for PostgreSQL
- **Build Tools**: Vite, esbuild, TypeScript

### Development Tools
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **Code Quality**: TypeScript strict mode, ESLint configuration
- **Development**: Vite dev server, hot reload, error overlays

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds optimized production bundle
- **Backend**: esbuild compiles TypeScript to ESM format
- **Assets**: Static files served from dist/public

### Environment Configuration
- **Development**: NODE_ENV=development, tsx for TypeScript execution
- **Production**: NODE_ENV=production, compiled JavaScript execution
- **Database**: DATABASE_URL environment variable for PostgreSQL connection

### Database Management
- **Migrations**: Drizzle Kit for schema management
- **Push Command**: `npm run db:push` applies schema changes
- **Configuration**: drizzle.config.ts with PostgreSQL dialect

### Production Considerations
- **Static Serving**: Express serves built frontend assets
- **API Routes**: Prefixed with /api for clear separation
- **Error Handling**: Comprehensive error middleware
- **Logging**: Request/response logging for debugging

### Brand Integration
The application maintains consistent branding throughout:
- **Colors**: Custom CSS variables for brand colors
- **Typography**: Professional styling with clear hierarchy
- **Layout**: Clean, systematic design reflecting expertise
- **Components**: Consistent UI patterns across all interactions