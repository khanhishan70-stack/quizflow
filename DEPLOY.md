# QuizFlow — Deploy to the Web (Step by Step)

## Part 1 — GitHub Pages (your 14 pages, free & live)

1. Create a repo at https://github.com/new (e.g. `quizflow`).
2. In your project folder run:
   ```
   git init
   git add .
   git commit -m "QuizFlow full project"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/quizflow.git
   git push -u origin main
   ```
3. GitHub → repo → **Settings → Pages** → Source: **Deploy from a branch** → `main` / root → Save.
4. Wait ~1 min. Your app is live at:
   `https://YOUR_USERNAME.github.io/quizflow/`

> Pages URL serves `index.html` automatically. All 14 pages work because
> data uses localStorage (no backend needed for quizzes).

## Part 2 — Battle Server (Render, free — makes Battle Mode work live)

1. Go to https://render.com → **Sign up** (GitHub login) → **New → Web Service**.
2. Connect your `quizflow` repo → Render auto-detects `render.yaml`.
3. Click **Create Web Service**. Free plan → wait 2–3 min to build.
4. When live you get a URL like: `https://quizflow-battle.onrender.com`

## Part 3 — Point the frontend to the live server

1. Open `assets/js/config.js`.
2. Set:
   ```js
   BATTLE_SERVER: 'wss://quizflow-battle.onrender.com'
   ```
3. Commit & push:
   ```
   git add .
   git commit -m "point battle to live server"
   git push
   ```

Done! Open your GitHub Pages URL on your phone — Quizzes work, and
Battle Mode now connects to the live WebSocket server.

## Notes
- GitHub Pages is HTTPS, so the server must be reached over `wss://` (Render gives you that automatically).
- Local test before deploying: start `node server/battle-server.js`, open `index.HTML`, keep `BATTLE_SERVER: ''`.