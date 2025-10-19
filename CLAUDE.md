# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LLM.txt Mastery - AI-powered website analysis and llms.txt file generation SaaS application.

**Tech Stack**:
- Frontend: React 18 + TypeScript + Vite (Netlify)
- Backend: Express.js + TypeScript (Railway)
- Database: PostgreSQL via Neon (managed)
- Payments: Stripe
- Authentication: JWT + bcrypt

**Business Model**: Freemium SaaS with 4 tiers (Starter/Solo/Growth/Scale)

## Environment Setup

### Production
- **Frontend**: https://llmtxtmastery.com (Netlify, `main` branch)
- **Backend**: https://llm-txt-mastery-production.up.railway.app (Railway, `main` branch)
- **Database**: Neon PostgreSQL (production project)

### Staging
- **Frontend**: https://develop--llm-txt-mastery.netlify.app (Netlify, `develop` branch)
- **Backend**: https://llm-txt-mastery-staging.up.railway.app (Railway, `develop` branch)
- **Database**: Neon PostgreSQL (staging project)

### Development Workflow
See `/docs/Operations/DEVELOPMENT_LIFECYCLE_GUIDE.md` for complete workflow.

**Branch Strategy**:
- `main` → Production (auto-deploy)
- `develop` → Staging (auto-deploy)
- `feature/*` → PR previews

**Deployment Flow**:
1. Create `feature/*` branch from `develop`
2. Push → PR to `develop` → Auto-deploys to staging
3. Test on staging URLs
4. PR from `develop` to `main` → Auto-deploys to production

### Service Dashboards
- **Railway**: Backend hosting and deployment logs
- **Netlify**: Frontend hosting and build logs
- **Neon**: Database management and SQL editor
- **Stripe**: Payment processing and subscriptions

**Note**: Create `.env.local` for local reference URLs and test account info (gitignored).

## User Profile and Communication Style

### User Context
- **ADHD**: Gets overwhelmed by too much information at once
- **Technical Knowledge**: Limited familiarity with terminal, Supabase, Netlify, macOS, GitHub
- **Communication Preference**: Smart brevity (Axios HQ style)
- **Instruction Needs**: Specific, step-by-step, with exact commands and UI navigation

### Communication Guidelines

**DO:**
- ✅ Use smart brevity - short, clear, actionable sentences
- ✅ ONE task at a time - never give multi-step walls of text
- ✅ Specify WHERE to run commands: "Open Terminal app (Cmd+Space, type 'Terminal')"
- ✅ Provide exact clicks: "Click 'Settings' → 'Database' → 'Connection string'"
- ✅ Assume zero context - explain every tool and location
- ✅ Use simple formatting: headers, bullets, short paragraphs
- ✅ Celebrate small wins frequently

**DON'T:**
- ❌ Give multi-option choices or long explanations
- ❌ Assume user knows how to run terminal commands
- ❌ Use technical jargon without explanation
- ❌ Provide multiple methods/options (pick the best one)
- ❌ Write long paragraphs or walls of text
- ❌ Say "run this command" without specifying WHERE

**Example - BAD:**
```
Now trigger the error:
curl -X POST https://llm-txt-mastery-staging.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

**Example - GOOD:**
```
Open Terminal (Cmd+Space, type "Terminal", press Enter)

Paste this command and press Enter:
curl -X POST https://llm-txt-mastery-staging.up.railway.app/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"testpass123"}'

You'll see an error - that's expected. Copy the error message.
```

## Critical Software Development Principles

### Security-First Development

**NEVER compromise security for convenience.** When encountering security features or policies:

1. **Understand Before Changing**
   - Research what the security feature does and why it exists
   - Understand the security implications of any changes
   - Find ways to work WITH security features, not around them
   - Example: `strict-dynamic` in CSP exists to prevent XSS attacks - use nonces properly instead of removing it

2. **Root Cause Analysis**
   - Ask "Why was this designed this way?" before making changes
   - Look for the architectural intent behind existing code
   - Consider the broader system impact of changes
   - Don't just fix symptoms - understand and address root causes

3. **Strategic Solution Checklist**
   Before implementing any fix, verify:
   - ✅ Does this maintain all security requirements?
   - ✅ Is this the architecturally correct solution?
   - ✅ Will this create technical debt?
   - ✅ Are there better long-term solutions?
   - ✅ Have I understood the original design intent?

4. **Common Anti-Patterns to Avoid**
   - ❌ Removing security features to "make things work"
   - ❌ Adding `any` types to bypass TypeScript errors
   - ❌ Using `@ts-ignore` without understanding the issue
   - ❌ Disabling linters or security scanners
   - ❌ Implementing quick fixes that break design patterns

5. **When Facing Issues**
   - PAUSE: Don't rush to implement the first solution
   - RESEARCH: Understand the system design and constraints
   - PROPOSE: Present multiple solutions with trade-offs
   - IMPLEMENT: Choose the solution that maintains system integrity
   - DOCUMENT: Record why decisions were made for future reference

## Architecture

This is a documentation-based project with the following structure:

- `/project/agents/` - Agent profiles and deployment commands
  - `core-squad.md` - 4 essential agents for getting started
  - `full-squad.md` - All 11 specialized agents
  - `specialists/` - Individual agent profiles with detailed capabilities
- `/project/field-manual/` - User guides and best practices
  - `architecture-sop.md` - Comprehensive architecture documentation guidelines
- `/project/missions/` - Predefined workflows and operation guides
- `/project/community/` - Success stories and user contributions
- `/templates/` - Reusable templates for common scenarios
  - `architecture.md` - Production-ready architecture documentation template

## Agent Deployment System

The core functionality involves deploying agents to Claude Code's `.claude/agents/` directory. The agents are then available via the `@` command:

```bash
# After installation, agents are available as:
@strategist Create user stories for our feature
@developer Implement the authentication system
@tester Validate the implementation
@operator Prepare for deployment

# NEW: Mission-based orchestration
/coord build requirements.md    # Orchestrate full build mission
/coord fix bug-report.md       # Quick bug fix mission
/coord mvp vision.md          # MVP development mission
```

## Key Components

### Core Squad (Minimum Viable Team)

1. **The Strategist** - Product strategy and requirements
2. **The Developer** - Full-stack implementation
3. **The Tester** - Quality assurance
4. **The Operator** - DevOps and deployment

### Full Squad (11 Specialists)

Includes the core squad plus:

- The Architect (system design)
- The Designer (UX/UI)
- The Documenter (technical writing)
- The Support (customer success)
- The Analyst (data insights)
- The Marketer (growth)
- The Coordinator (mission orchestration)

## Development Guidelines

- This is a documentation-first project with no build system or package.json
- All content is in Markdown format
- Agent profiles follow a consistent structure with deployment commands, capabilities, and collaboration protocols
- Documentation uses military/tactical metaphors consistently
- Focus on actionable, practical guidance for solo founders
- **CRITICAL**: All agents must follow the Critical Software Development Principles above
- Security-first mindset required for all development decisions
- Root cause analysis mandatory before implementing fixes

## File Editing Conventions

- Maintain the consistent tone and military theme throughout
- Agent profiles should include deployment commands, capabilities, collaboration protocols, and real examples
- Use consistent formatting with emoji indicators for different sections
- Keep deployment commands as single-line strings for easy copy/paste
- Include practical examples and workflows in documentation

## Ideation File Concept

The ideation file is a centralized document containing all requirements, context, and vision for a development project. This can include:

- Product Requirements Documents (PRDs)
- Brand guidelines
- Architecture specifications
- Vision documents
- User research
- Market analysis
- Technical constraints

### Standard Location

- Primary: `./ideation.md`
- Alternative: `./docs/ideation/`
- Can be multiple files referenced in CLAUDE.md

## Progress Tracking System

### Core Tracking Files

1. **project-plan.md** - Strategic roadmap and milestones
   - Executive summary, objectives, technical architecture
   - Milestone timeline, success metrics, risk assessment

2. **progress.md** - Operational log and learnings
   - Issues and resolutions, lessons learned
   - Technical decisions and performance insights

### Update Protocol

After each work session or milestone:

1. ✅ Mark completed tasks in `project-plan.md`
2. 📝 Log issues, resolutions, and lessons in `progress.md`
3. ⚡ Record performance insights and optimizations in `CLAUDE.md`

## Design Review System

For UI/UX projects, AGENT-11 includes design review capabilities:

- **@designer**: Enhanced with comprehensive UI/UX assessment
- **@design-review**: Dedicated agent for design audits (when available)
- **Standards**: Live environment testing, evidence-based feedback

_Note: For project-specific design principles, add them to your project's CLAUDE.md file. See `/templates/` for design principles template._

## Mission Documentation Standards

### Mandatory Tracking Files

For all missions, coordinators MUST maintain:

- **project-plan.md**: Strategic roadmap with task completion tracking
- **progress.md**: Issues, resolutions, and lessons learned
- **architecture.md**: System design and architecture decisions (for kickoff missions)
- **Templates**: Available in `/templates/` directory

### Architecture Documentation

- **Template**: `/templates/architecture.md` - Production-ready template with examples
- **SOP**: `/project/field-manual/architecture-sop.md` - Comprehensive guidelines
- **When Created**: During dev-setup (new projects) or dev-alignment (existing projects)

### Critical Requirements

1. Update files immediately when issues occur or phases complete
2. Mark tasks complete [x] only after specialist confirmation
3. Log all problems for future learning
4. Both files mandatory before proceeding to next phase

## Context Preservation System

### Overview

AGENT-11 implements a comprehensive context preservation system inspired by BOS-AI's proven approach, ensuring zero context loss across multi-agent workflows. This system maintains continuity through persistent context files and mandatory handoff protocols.

### Core Context Files

#### 1. agent-context.md

- **Purpose**: Rolling accumulation of all findings, decisions, and critical information
- **Location**: `/agent-context.md` (mission root)
- **Updated By**: Coordinator after each agent task
- **Contains**: Mission objectives, accumulated findings, technical decisions, known issues, dependencies

#### 2. handoff-notes.md

- **Purpose**: Specific context for the next agent in workflow
- **Location**: `/handoff-notes.md` (mission root)
- **Updated By**: Each agent before task completion
- **Contains**: Immediate task, critical context, warnings, specific instructions, test results

#### 3. evidence-repository.md

- **Purpose**: Centralized collection of artifacts and supporting materials
- **Location**: `/evidence-repository.md` (mission root)
- **Updated By**: Any agent producing evidence
- **Contains**: Screenshots, code snippets, test results, API responses, error logs

### Context Preservation Protocol

#### Before Task Execution

1. Agent MUST read `agent-context.md` and `handoff-notes.md`
2. Agent acknowledges understanding of objectives and constraints
3. Agent identifies relevant prior work and decisions

#### During Task Execution

1. Agent maintains awareness of mission context
2. Agent aligns work with documented decisions
3. Agent captures new findings and decisions

#### After Task Completion

1. Agent updates `handoff-notes.md` with findings for next agent
2. Agent adds evidence to `evidence-repository.md` if applicable
3. Coordinator merges findings into `agent-context.md`

### Enforcement Mechanisms

#### Coordinator Enforcement

- Coordinator includes context reading requirement in every Task tool delegation
- Coordinator verifies handoff documentation before marking tasks complete
- Coordinator maintains context file integrity throughout mission

#### Delegation Template

```
Task(
  subagent_type="developer",
  prompt="First read agent-context.md and handoff-notes.md for mission context.
          CRITICAL: Follow the Critical Software Development Principles - never compromise security for convenience, perform root cause analysis before fixes.
          [Specific task instructions].
          Update handoff-notes.md with your findings and decisions for the next specialist."
)
```

### Benefits

- **87.5% reduction in rework** - Agents build on prior work effectively
- **37.5% faster completion** - No time lost to context reconstruction
- **Zero context loss** - All decisions and findings preserved
- **Complete audit trail** - Full history of mission evolution
- **Pause/resume capability** - Missions can be interrupted and continued

### Templates

Context preservation templates are available in `/templates/`:

- `agent-context-template.md` - Mission-wide context accumulator
- `handoff-notes-template.md` - Agent-to-agent handoff structure
- `evidence-repository-template.md` - Artifact collection format

## Coordinator Delegation Protocol

### CRITICAL: Using /coord Command

When using `/coord` to orchestrate missions, the coordinator MUST use the Task tool for actual delegation:

1. **Task Tool Usage (CORRECT)**:
   - The coordinator must call the Task tool with proper parameters
   - Example: `Task(subagent_type="developer", description="Fix auth", prompt="Detailed instructions...")`
   - This actually spawns a new agent instance that performs the work

2. **@agent Syntax (INCORRECT)**:
   - Never use `@agent` syntax in coordinator prompts - this is just text output
   - `@developer` is for users to invoke agents directly, not for internal delegation
   - Writing "Delegating to @developer" does NOT actually delegate anything

3. **Verification Protocol**:
   - Coordinator must confirm Task tool was actually called
   - Look for "Using Task tool with subagent_type='[agent]'" in output
   - If you see "Delegating to @agent" without Task tool usage, delegation didn't happen

4. **Example of Proper Delegation**:

   ```
   # WRONG (just describes delegation):
   "I'm delegating to @tester for testing"

   # RIGHT (actually uses Task tool):
   Task(
     subagent_type="tester",
     description="Test auth flow",
     prompt="Create Playwright tests for authentication..."
   )
   ```

### NO ROLE-PLAYING RULE

The coordinator must NEVER role-play or simulate delegation. Every delegation must be an actual Task tool invocation that spawns a real agent instance. Status updates should reflect actual Task tool responses, not imagined agent responses.

### CONTEXT PRESERVATION REQUIREMENT

Every Task tool invocation MUST include instructions to read context files first and update handoff notes after completion. This ensures seamless context flow between agents.

### PRINCIPLE ENFORCEMENT IN DELEGATION

Every Task tool delegation MUST remind agents to:

- Follow Critical Software Development Principles
- Never compromise security for convenience
- Perform root cause analysis before implementing fixes
- Document strategic decisions in handoff-notes.md

## Common Tasks

### Project Initialization

#### Greenfield Projects (New)

```bash
/coord dev-setup ideation.md
```

- Sets up GitHub repository
- Analyzes ideation documents
- Creates architecture.md from template
- Creates project-plan.md
- Initializes progress.md
- Configures CLAUDE.md

#### Existing Projects (Brownfield)

```bash
/coord dev-alignment
```

- Analyzes existing codebase
- Understands project context
- Reviews/creates architecture.md
- Creates/updates tracking files
- Optimizes CLAUDE.md for project

### Adding New Agent Profiles

1. Create new file in `/project/agents/specialists/`
2. Follow existing template structure
3. Update `/project/agents/full-squad.md` with new agent
4. Add deployment command to relevant quick-start guides

### Updating Documentation

- Maintain consistency with existing tone and structure
- Focus on practical, actionable content
- Include real-world examples and workflows
- Keep military/tactical metaphors throughout

### Content Guidelines

- Write for solo founders and non-technical founders
- Emphasize speed, efficiency, and practical results
- Include specific commands and examples
- Maintain the "elite squad" branding throughout
- **ESSENTIAL**: Reference Critical Software Development Principles in all agent guidance
- Ensure security-first development is emphasized in all documentation

## MCP (Model Context Protocol) Integration

### MCP-First Principle

Agents should prioritize using available MCP servers before implementing functionality manually. This ensures efficiency, consistency, and leverages proven implementations.

### MCP Discovery Protocol

1. **Check Available MCPs**: Use `grep "mcp__"` or look for tools starting with `mcp__` prefix
2. **Prioritize MCP Usage**: Always check if an MCP can handle the task before manual implementation
3. **Document MCP Usage**: Track which MCPs are used in project-plan.md and CLAUDE.md
4. **Fallback Strategy**: Have manual approach ready when specific MCPs aren't available

### MCP Tool Categories

#### Infrastructure & Deployment

- **mcp\_\_railway** - Backend services, databases, cron jobs, workers, auto-scaling
- **mcp\_\_netlify** - Frontend hosting, edge functions, forms, redirects
- **mcp\_\_vercel** - Alternative frontend hosting with serverless functions
- **mcp\_\_supabase** - Managed Postgres, auth, real-time, storage, edge functions

#### Commerce & Payments

- **mcp\_\_stripe** - Payments, subscriptions, invoicing, revenue analytics, webhooks
- **mcp\_\_paddle** - Alternative payment processor (if available)
- **mcp\_\_shopify** - E-commerce platform integration (if available)

#### Development & Version Control

- **mcp\_\_github** - PRs, issues, releases, CI/CD with Actions, project boards
- **mcp\_\_gitlab** - Alternative version control (if available)
- **mcp\_\_bitbucket** - Alternative version control (if available)

#### Documentation & Knowledge

- **mcp\_\_context7** - Library documentation, code patterns, best practices
- **mcp**context7**resolve-library-id** - Find correct library identifiers
- **mcp**context7**get-library-docs** - Retrieve up-to-date documentation

#### Testing & Quality Assurance

- **mcp\_\_playwright** - Complete browser automation suite:
  - Browser navigation, interaction, screenshots
  - Cross-browser testing (Chrome, Firefox, Safari)
  - Visual regression testing
  - Accessibility testing
  - Performance monitoring

#### Code Search & Research

- **mcp\_\_grep** - Search 1M+ GitHub repositories for:
  - Code patterns and implementations
  - Architecture examples in production
  - Test patterns and edge cases
  - Documentation structures
  - Error handling patterns
  - Example usage: `grep_query("async def", language="Python", repo="fastapi/fastapi")`

#### Research & Analysis

- **mcp\_\_firecrawl** - Web scraping, competitor analysis, market research
- **WebSearch** - Current events, trends, real-time information
- **WebFetch** - Specific page analysis and content extraction

#### Communication & Support

- **mcp\_\_slack** - Team communication (if available)
- **mcp\_\_discord** - Community management (if available)
- **mcp\_\_intercom** - Customer support (if available)

### MCP Usage Pattern

**Standard Workflow**: Always check for relevant MCPs first:

1. **Research**: Use mcp\_\_grep for existing implementations
2. **Documentation**: Use mcp\_\_context7 for official docs
3. **Services**: Use service-specific MCPs (mcp**supabase, mcp**stripe, etc.)
4. **Testing**: Use mcp\_\_playwright for browser automation
5. **Fallback**: Manual implementation only when MCPs unavailable

### MCP Integration in Missions

All missions should include an MCP discovery phase:

1. Identify available MCPs at mission start
2. Map MCPs to mission tasks
3. Include MCP usage in execution plans
4. Document MCPs used for future reference

### Agent Tool Specification Standards

All agent profiles should explicitly list their available tools:

- **Primary MCPs**: Service-specific tools (e.g., mcp**supabase, mcp**stripe)
- **Core Tools**: Essential Claude Code tools (Edit, Read, Bash, etc.)
- **Fallback Tools**: Alternatives when MCPs unavailable

_See `/templates/agent-creation-mastery.md` for complete tool specification format and agent-specific tool sets._

## MCP (Model Context Protocol) Setup

### Quick Start

1. **Copy environment template**: `cp .env.mcp.template .env.mcp`
2. **Add your API keys** to `.env.mcp`
3. **Run setup**: `./project/deployment/scripts/mcp-setup.sh`
4. **Verify**: `./project/deployment/scripts/mcp-setup.sh --verify`
5. **Restart Claude Code** for changes to take effect

### MCP Configuration Files

- **`.mcp.json`** - Project-scoped MCP server definitions
- **`.env.mcp`** - API keys and tokens (keep in .gitignore!)
- **`.env.mcp.template`** - Template with all required variables

### Required MCPs for Full Functionality

- **Context7** - Library documentation and code patterns
- **GitHub** - Repository management and PRs
- **Firecrawl** - Web scraping and research
- **Supabase** - Database and authentication
- **Playwright** - Browser automation and testing

### MCP Troubleshooting

- If MCPs don't appear, restart Claude Code
- Check `.mcp-status.md` for connection report
- Verify API keys in `.env.mcp` are correct
- Run `grep "mcp__"` to see available MCP tools

## Available Commands

### Mission Orchestration

- `/coord [mission] [files]` - Orchestrate multi-agent missions
- `/design-review` - Comprehensive UI/UX audit
- `/recon` - Design reconnaissance
- `/meeting [agenda]` - Facilitate structured meetings

### Reporting & Analysis

- `/report [since_date]` - Generate progress reports for stakeholders
- `/pmd [issue]` - Post Mortem Dump for root cause analysis

## Development Notes

- **No Build System**: Pure documentation project - verify changes through Markdown review and deployment testing
- **Mission System**: Use `/coord [mission] [files]` for systematic workflows
- **Templates**: Available in `/templates/` for reusable patterns
- **Updates**: Changes automatically deployed via GitHub integration
