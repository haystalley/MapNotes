# Deploying MapNotes to GitHub Pages

This guide walks you through getting your MapNotes app live at:
`https://<your-github-username>.github.io/interactive-map-app/`

Everything in the app (map tiles, markers, shapes, image uploads) works
perfectly on GitHub Pages — it is fully static and requires no server.

---

## Prerequisites

- A [GitHub account](https://github.com)
- [Git](https://git-scm.com/downloads) installed on your machine (or use the Replit Shell)

---

## Step 1 — Create a GitHub repository

1. Go to [github.com/new](https://github.com/new)
2. Set **Repository name** to exactly: `interactive-map-app`
   > The repo name must match the `BASE_PATH` in `.github/workflows/deploy.yml`.
   > If you choose a different name, update line `BASE_PATH: /interactive-map-app/`
   > in the workflow file to match (e.g. `BASE_PATH: /my-custom-name/`).
3. Set visibility to **Public** (GitHub Pages is free for public repos)
4. Leave "Initialize this repository" **unchecked**
5. Click **Create repository**

---

## Step 2 — Push your code to GitHub

Open the Shell in Replit (or a local terminal) and run these commands one at a time:

```bash
# Initialize git (skip if already done)
git init

# Add all files
git add .

# Make an initial commit
git commit -m "Initial commit — MapNotes app"

# Point to your new GitHub repo (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/interactive-map-app.git

# Push to the main branch
git push -u origin main
```

> If you already have a remote named `origin`, run:
> `git remote set-url origin https://github.com/YOUR_USERNAME/interactive-map-app.git`

---

## Step 3 — Watch the automated build

Once your code is pushed, GitHub Actions will automatically:

1. Install dependencies
2. Build the app with the correct base path
3. Deploy the built files to a `gh-pages` branch

To watch the progress:
1. Go to your repository on GitHub
2. Click the **Actions** tab
3. Click the **Deploy to GitHub Pages** workflow run
4. Wait for all steps to show a green checkmark (takes ~2 minutes)

---

## Step 4 — Enable GitHub Pages

After the workflow succeeds and the `gh-pages` branch exists:

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Source**, select:
   - Branch: `gh-pages`
   - Folder: `/ (root)`
4. Click **Save**

GitHub will show a banner: *"Your site is ready to be published at..."*

---

## Step 5 — Access your live app

Wait about 1 minute after enabling Pages, then visit:

```
https://YOUR_USERNAME.github.io/interactive-map-app/
```

Your fully functional map app is now live on the web!

---

## Future updates

Every time you push to the `main` branch, GitHub Actions will automatically
rebuild and redeploy your app. No manual steps needed.

```bash
git add .
git commit -m "Your update message"
git push
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Map tiles don't load | Check browser console — tiles use `https://` so there are no mixed-content issues |
| App shows 404 on page load | Make sure the repo name in GitHub Settings → Pages matches `BASE_PATH` in the workflow |
| Build fails in GitHub Actions | Check the Actions tab for error details. Common cause: repo name mismatch with `BASE_PATH` |
| Data doesn't persist | IndexedDB is per-origin — data saved on `localhost` won't carry over to the GitHub Pages URL (this is expected browser security behavior) |
| Workflow doesn't trigger | Confirm you pushed to the `main` branch, not `master` |

---

## Customising the repo name

If you want a different URL than `interactive-map-app`, pick any repo name and:

1. Create the GitHub repo with your chosen name
2. Open `.github/workflows/deploy.yml` and change:
   ```yaml
   BASE_PATH: /interactive-map-app/
   ```
   to:
   ```yaml
   BASE_PATH: /your-chosen-name/
   ```
3. Commit and push — the workflow will rebuild with the new base path
