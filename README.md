# LLM.txt Mastery

An intelligent web application that automates the creation of optimized `llms.txt` files through advanced sitemap analysis and AI-powered content curation.

**Live at**: [llmtxtmastery.com](https://llmtxtmastery.com)

## 🎯 What It Does

LLM.txt Mastery helps website owners create standards-compliant `llms.txt` files that tell AI systems which pages to prioritize for training and understanding. It analyzes your website, scores content quality, and generates optimized files that improve how AI interprets your site.

## 🚀 Key Features

- **Smart Website Analysis**: Processes up to 200 pages with 7+ fallback strategies for sitemap discovery
- **AI-Powered Content Scoring**: Uses GPT-4o-mini to evaluate content quality and relevance (93% cheaper than GPT-4o)
- **Intelligent Caching**: 30-day cache reduces API costs by 70-90%
- **Freemium Model**:
  - **Free Tier**: 3 analyses/day with AI scoring for first 20 pages
  - **Coffee Tier**: $5 one-time for premium analysis credits
  - **Growth/Scale**: Monthly subscriptions for unlimited access
- **Professional Output**: Standards-compliant LLM.txt files with quality scoring documentation

## 🏗️ Production Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Netlify CDN   │◄────────│   Railway API    │◄────────│   Neon DB      │
│   (Frontend)    │  CORS   │   (Backend)      │   SQL   │   (PostgreSQL)  │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                            │                            │
        ▼                            ▼                            ▼
   llmtxtmastery.com    llm-txt-mastery-         ep-dark-fire-ae795ogn
                        production.up.            -pooler.c-2.us-east-2
                        railway.app               .aws.neon.tech
```

### Infrastructure Details

- **Frontend**: React SPA on Netlify (auto-deploys from GitHub)
- **Backend**: Express.js API on Railway (auto-deploys from GitHub)
- **Database**: Neon PostgreSQL with connection pooling
- **AI Model**: OpenAI GPT-4o-mini (configurable via environment)
- **Payments**: Stripe integration for freemium model
- **Caching**: In-database with tier-specific TTL

## 🛠️ Technology Stack

### Frontend

- **React 18** with TypeScript
- **Tailwind CSS** with custom design system
- **shadcn/ui** component library
- **TanStack Query** for server state management
- **Wouter** for routing

### Backend

- **Express.js** with TypeScript
- **PostgreSQL** with Drizzle ORM
- **OpenAI GPT-4o-mini** for content analysis
- **Cheerio** for HTML parsing
- **Stripe** for payments

## 📚 Documentation

### For Operators & Maintainers

See **[OPERATIONS.md](./OPERATIONS.md)** for:

- Complete environment variables reference
- Deployment procedures
- Monitoring and maintenance
- Cost optimization strategies
- Troubleshooting guide
- Emergency procedures

### For Developers

See **[CLAUDE.md](./CLAUDE.md)** for:

- AI assistant integration notes
- Development workflow
- Code architecture decisions

## 🚀 Quick Start (Development)

### Prerequisites

- Node.js 18+
- PostgreSQL database (or use Neon cloud)
- OpenAI API key
- Stripe account (for payments)

### Local Development

1. **Clone and install:**

   ```bash
   git clone https://github.com/TheWayWithin/llm-txt-mastery.git
   cd llm-txt-mastery
   npm install
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your keys
   ```

3. **Set up database:**

   ```bash
   npm run db:push
   ```

4. **Start development server:**
   ```bash
   npm run dev
   # Opens at http://localhost:5000
   ```

## 🚢 Deployment

The application uses a split deployment architecture:

### Automatic Deployment (Current Setup)

- **Push to main** → Railway auto-deploys backend
- **Push to main** → Netlify auto-deploys frontend
- No manual intervention needed!

### Manual Deployment

See [OPERATIONS.md](./OPERATIONS.md#deployment-guide) for detailed deployment procedures.

## 💰 Cost Optimization

### Current Optimizations

- **AI Model**: Using GPT-4o-mini (93% cheaper than GPT-4o)
- **Caching**: 30-day cache reduces API calls by 70-90%
- **Smart Batching**: Processes pages in optimized batches
- **Tier Limits**: Prevents runaway costs with daily limits

### Typical Costs

- **OpenAI API**: ~$0.11 per 1000 pages (with GPT-4o-mini)
- **Database**: Free tier (up to 0.5GB)
- **Hosting**: ~$5/month Railway, Free Netlify tier

## 📊 Performance Metrics

- **Analysis Speed**: ~4.8 seconds for 200 pages
- **Cache Hit Rate**: 70-90% for popular sites
- **Success Rate**: 98%+ sitemap discovery
- **Quality Filter**: 95%+ accurate page selection
- **Cost Savings**: 93% reduction with GPT-4o-mini

## 🔧 Key Scripts

```bash
# Development
npm run dev          # Start local development server
npm run build        # Build for production
npm run check        # TypeScript type checking

# Database
npm run db:push      # Push schema changes
npm run migrate      # Run migrations

# Testing
npm test             # Run test suite
npx tsx server/test-model-comparison.ts  # Compare AI models
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📈 Monitoring

### Health Checks

- Backend: `https://llm-txt-mastery-production.up.railway.app/health`
- Frontend: `https://llmtxtmastery.com`

### Dashboards

- [Railway Dashboard](https://railway.app) - Backend metrics
- [Netlify Dashboard](https://app.netlify.com) - Frontend deploys
- [Stripe Dashboard](https://dashboard.stripe.com) - Payment analytics

## 🔒 Security

- Environment variables for sensitive data
- Input validation and sanitization
- Rate limiting on all API endpoints
- CORS protection for API access
- Secure PostgreSQL connections with SSL

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT-4o-mini API
- **Railway** for backend hosting
- **Netlify** for frontend CDN
- **Neon** for managed PostgreSQL
- **shadcn/ui** for beautiful components
- The open-source community

## 👨‍💻 Author

Built by **Jamie Watters** - Solopreneur & Tool Builder

---

**Built with ❤️ for the AI community**

For detailed operational procedures, troubleshooting, and configuration management, see [OPERATIONS.md](./OPERATIONS.md).
