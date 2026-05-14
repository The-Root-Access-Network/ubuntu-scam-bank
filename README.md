# UbuntuScamBank

> *"I am because we are."* — A community-powered shield against scams.

**UbuntuScamBank** is a crowdsourced threat intelligence platform built by [The Root Access Network (TRAN)](https://therootaccessnetwork.com) under the [Unbuntu Bridge Initiative (UBI)](https://ubuntubridgeinitiatives.org/). Anyone can report scams they've received, earn points for contributing, and help protect others in their community. Security researchers get access to a clean, open feed of real-world threat data.

---

## 🎯 What It Does

- **Report** — Submit scams you've received (SMS, email, WhatsApp, phone calls, links, and more)
- **Earn** — Get points for verified reports that help others stay safe
- **Protect** — Browse and search the community scam feed to recognise threats before they hit you
- **Research** — Security researchers access a structured, open feed of crowdsourced threat intelligence

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | [Next.js](https://nextjs.org/) + TypeScript |
| Backend / API | Next.js API Routes |
| Database & Auth | [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage) |
| Deployment | TBD |

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

---

## 📁 Project Structure

```
ubuntu-scam-bank/
├── app/                  # Next.js App Router pages and layouts
├── components/           # Reusable UI components
├── lib/                  # Supabase client, utilities, helpers
├── types/                # TypeScript type definitions
├── public/               # Static assets
└── supabase/             # Database migrations and seed files
```

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

If you discover a security vulnerability in this project, please report it responsibly by emailing **info@therootaccessnetwork.com** rather than opening a public issue.

---

## 📄 License

[MIT License](LICENSE) — © 2026 [The Root Access Network](https://therootaccessnetwork.com)

---

## 🌍 About TRAN

The Root Access Network is a Lagos-based cybersecurity education company dedicated to making digital safety accessible to everyone — from secondary school students to early-career professionals across Africa and beyond.

🌐 [therootaccessnetwork.com](https://therootaccessnetwork.com) · 📧 info@therootaccessnetwork.com
