# Branching Strategy — UbuntuScamBank

UbuntuScamBank follows a **two-branch Gitflow-lite** workflow designed to keep production stable, development organised, and releases intentional.

---

## Branch Structure

```
main
 └── dev
      ├── feature/scam-submission-form
      ├── feature/user-auth
      ├── fix/broken-report-api
      └── ...
```

### `main`
- Represents **production-ready code only**
- Always stable and deployable
- **No one pushes directly to `main`** — ever
- Only updated via a reviewed `dev → main` pull request, managed by maintainers/owners
- Every merge into `main` is tagged as a release (e.g. `v0.1.0`)

### `dev`
- The **active integration branch**
- All completed feature branches are merged here first
- Code here may be ahead of `main` and is considered work-in-progress until promoted
- **No one pushes directly to `dev`** — all changes come in via pull requests from feature branches

### `feature/*` / `fix/*` / `docs/*` branches
- Created by developers for individual pieces of work
- Always branched off `dev` — never off `main`
- Merged back into `dev` via pull request after review
- Deleted after the PR is merged

---

## Day-to-Day Developer Workflow

### 1. Start from an up-to-date `dev`
```bash
git checkout dev
git pull origin dev
```

### 2. Create your feature branch
```bash
git checkout -b feature/your-feature-name
```

Follow the branch naming convention:

| Type | Format | Example |
|------|--------|---------|
| New feature | `feature/short-description` | `feature/scam-submission-form` |
| Bug fix | `fix/short-description` | `fix/broken-report-api` |
| Documentation | `docs/short-description` | `docs/update-setup-guide` |
| Refactor | `refactor/short-description` | `refactor/cleanup-supabase-client` |

### 3. Do your work and commit regularly
```bash
git add .
git commit -m "feat: add scam submission form with category selector"
```

Follow the commit message convention: `type: short description in present tense`
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### 4. Push your branch
```bash
git push origin feature/your-feature-name
```

### 5. Open a Pull Request into `dev`
- Go to the repo on GitHub
- Open a PR from your branch → **target `dev`, not `main`**
- Fill out the PR template fully
- Request a review from a maintainer
- Do not merge your own PR without an approval

### 6. After merge, clean up
```bash
git checkout dev
git pull origin dev
git branch -d feature/your-feature-name
```

---

## Release Workflow (Maintainers Only)

When `dev` has accumulated enough tested, reviewed work to ship:

1. Open a PR from `dev` → `main`
2. PR title format: `release: vX.X.X`
3. In the PR description, summarise what's included (features, fixes)
4. At least one Owner reviews and approves
5. Merge into `main`
6. Tag the release:
   ```bash
   git checkout main
   git pull origin main
   git tag -a v0.1.0 -m "Release v0.1.0 — initial scam submission flow"
   git push origin v0.1.0
   ```
7. Create a GitHub Release from the tag with release notes

---

## Quick Reference

| Action | Branch to use |
|--------|--------------|
| Start new feature | Branch off `dev` |
| Submit completed work | PR into `dev` |
| Hotfix on production | Branch off `main`, PR into both `main` and `dev` |
| Release to production | PR from `dev` into `main` (maintainers only) |
| Direct push to `main` | ❌ Never |
| Direct push to `dev` | ❌ Never |

---

## First-Time Setup

When you clone the repo for the first time, make sure you have the `dev` branch locally:

```bash
git clone https://github.com/TheRootAccessNetwork/ubuntu-scam-bank.git
cd ubuntu-scam-bank
git checkout dev
git pull origin dev
```

All your work starts from here.
