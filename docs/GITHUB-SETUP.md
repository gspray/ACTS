# GitHub Setup Instructions

The ACTS project is initialized locally with git on branch `main`. Use the steps below to create the GitHub remote and push.

## Prerequisites

- Git is already initialized in this project
- An initial commit exists on `main`
- You need either [GitHub CLI (`gh`)](https://cli.github.com/) or a GitHub account with permission to create repositories

## Option A: GitHub CLI (recommended)

### 1. Install and authenticate

```bash
brew install gh
gh auth login
```

### 2. Create the repo and push

From the project root:

```bash
cd ~/Projects/ACTS
gh repo create ACTS --public --source=. --remote=origin --push
```

This will:

- Create a public GitHub repo named `ACTS`
- Add `origin` as the remote
- Push the current `main` branch

## Option B: Manual setup on GitHub.com

### 1. Create the repository

1. Go to https://github.com/new
2. Set the repository name to `ACTS`
3. Choose public or private
4. Do **not** initialize with a README, `.gitignore`, or license (this project already has those locally)
5. Click **Create repository**

### 2. Connect and push

Replace `YOUR_USERNAME` with your GitHub username:

```bash
cd ~/Projects/ACTS
git remote add origin https://github.com/YOUR_USERNAME/ACTS.git
git push -u origin main
```

## Verify

After pushing, confirm the remote is configured:

```bash
git remote -v
git status
```

You should see `origin` pointing at your GitHub repo and `Your branch is up to date with 'origin/main'`.

## Notes

- Do not commit secrets (`.env`, credentials, tokens). They are listed in `.gitignore`.
- The mirrored site lives in `site/`. Re-crawl with `npm run crawl` before committing major content updates.
- If `gh` is not installed, Option B works without any extra tools.
