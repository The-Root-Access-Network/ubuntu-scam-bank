# UbuntuScamBank

> _"I am because we are."_ — A community-powered shield against scams.

**UbuntuScamBank** is a crowdsourced threat intelligence platform built by [The Root Access Network (TRAN)](https://therootaccessnetwork.com) under the [Unbuntu Bridge Initiative (UBI)](https://ubuntubridgeinitiatives.org/). Anyone can report scams they've received, earn points for contributing, and help protect others in their community. Security researchers get access to a clean, open feed of real-world threat data.

---

## 🎯 What It Does

- **Report** — Submit scams you've received (SMS, email, WhatsApp, phone calls, links, and more)
- **Earn** — Get points for verified reports that help others stay safe
- **Protect** — Browse and search the community scam feed to recognise threats before they hit you
- **Research** — Security researchers access a structured, open feed of crowdsourced threat intelligence

---

## 🛠️ Tech Stack

| Layer           | Technology                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| Frontend        | [Next.js](https://nextjs.org/) + TypeScript                                                              |
| Backend / API   | Next.js API Routes                                                                                       |
| Database & Auth | [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage)                                          |
| Deployment      | [Cloudflare Workers](https://workers.cloudflare.com/) via [OpenNext](https://opennext.js.org/cloudflare) |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A [Supabase](https://supabase.com/) project (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/TheRootAccessNetwork/ubuntu-scam-bank.git
cd ubuntu-scam-bank

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase URL and anon key in .env.local
```

### Environment Variables

Create a `.env.local` file at the root with the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Preview (Cloudflare Workers runtime)

To test the app in the actual Cloudflare Workers runtime locally:

```bash
npm run preview
```

Open [http://localhost:8787](http://localhost:8787) in your browser.

This is more accurate to production than `npm run dev` — use it before
opening PRs or when testing API routes and middleware behaviour.

### Live URL

**_[https://ubuntu-scam-bank.therootaccessnetwork.workers.dev/](https://ubuntu-scam-bank.therootaccessnetwork.workers.dev/)_**

---

## 📁 Project Structure

```sh
ubuntu-scam-bank/
├── src/
│   ├── app/
│   │   ├── (public)/              # Route group — public-facing pages
│   │   │   └── page.tsx           # Homepage (move the default page.tsx here)
│   │   ├── api/                   # API routes
│   │   │   ├── reports/
│   │   │   │   └── route.ts       # GET /api/reports
│   │   │   ├── submit/
│   │   │   │   └── route.ts       # POST /api/submit
│   │   │   └── triage/
│   │   │       └── route.ts       # Internal: Claude triage pipeline
│   │   ├── globals.css
│   │   ├── layout.tsx             # Root layout
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/                    # Primitive components (Button, Badge, Card...)
│   │   ├── layout/                # Nav, Footer, PageWrapper
│   │   ├── forms/                 # SubmissionForm, TypeSelector, SeverityPicker
│   │   └── feed/                  # FeedCard, FeedList, FeedFilters
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts          # Browser Supabase client
│   │   │   ├── server.ts          # Server-side Supabase client
│   │   │   └── middleware.ts      # Session refresh helper
│   │   ├── ai/
│   │   │   ├── triage.ts          # Claude triage pipeline (from AI_TRIAGE.md)
│   │   │   └── prompts.ts         # System prompt — kept separate for easy editing
│   │   ├── points/
│   │   │   └── calculate.ts       # Points + bonus logic
│   │   └── utils.ts               # cn() helper, formatters, etc.
│   ├── types/
│   │   ├── database.ts            # Supabase table types (you'll generate these later)
│   │   └── triage.ts              # TriageResult, PointsResult interfaces
│   └── hooks/                     # Custom React hooks (useReports, useLeaderboard, etc.)
│       └── .gitkeep
├── public/
├── .env.local                     # Never committed
├── .env.example                   # Committed — template with no real values
├── middleware.ts                  # Next.js middleware (Supabase session refresh)
├── next.config.ts
├── open-next.config.ts
├── tailwind.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── wrangler.jsonc
└── package.json
```

---

## Design Guide - References for when writing components

| You need                         | Tailwind class                 |
| -------------------------------- | ------------------------------ |
| Brand green background           | `bg-brand`                     |
| Dark green text (on light badge) | `text-brand-dark`              |
| Light green card background      | `bg-brand-light`               |
| Phishing badge                   | `bg-phishing-bg text-phishing` |
| Severity high dot                | `bg-severity-high`             |
| White card surface               | `bg-canvas`                    |
| Off-white page background        | `bg-canvas-subtle`             |
| Primary body text                | `text-fg`                      |
| Muted/secondary text             | `text-fg-muted`                |
| Subtle border (0.5px cards)      | `border-stroke-faint`          |
| Card shadow                      | `shadow-card`                  |
| Card border radius               | `rounded-lg`                   |
| Input border radius              | `rounded-md`                   |
| Sans font                        | `font-sans`                    |
| Mono font (IOCs, API code)       | `font-mono`                    |

---

## 🗺️ Roadmap

- [ ] Scam submission form (SMS, email, WhatsApp, call, link)
- [ ] User authentication (sign up / sign in via Supabase Auth)
- [ ] Points and contribution tracking
- [ ] Public scam feed with search and filters
- [ ] Scam verification workflow
- [ ] Researcher API feed (open, structured)
- [ ] Leaderboard for top contributors

---

## 🤝 Contributing

This is an internal TRAN project. If you're part of the team, please read the [Contributing Guidelines](https://github.com/TheRootAccessNetwork/.github/blob/main/CONTRIBUTING.md) and [Code of Conduct](https://github.com/TheRootAccessNetwork/.github/blob/main/CODE_OF_CONDUCT.md) before getting started.

We follow a two-branch workflow — see [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) for the full guide. In short:

- **Never work directly on `main` or `dev`**
- Branch off `dev` → do your work → open a PR back into `dev`
- `dev → main` merges are handled by maintainers/owners as releases only

Direct pushes to `main` are not permitted.

---

## 🔒 Security

If you discover a security vulnerability in this project, please report it responsibly by emailing **[info@therootaccessnetwork.com](info@therootaccessnetwork.com)** rather than opening a public issue.

---

## 📄 License

[MIT License](LICENSE) — © 2026 [The Root Access Network](https://therootaccessnetwork.com)

---

## 🌍 About TRAN

The Root Access Network is a Lagos-based cybersecurity education company dedicated to making digital safety accessible to everyone — from secondary school students to early-career professionals across Africa and beyond.

🌐 [therootaccessnetwork.com](https://therootaccessnetwork.com) · 📧 [info@therootaccessnetwork.com](info@therootaccessnetwork.com)
