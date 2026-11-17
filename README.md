# 📥 TeraBox Downloader Telegram Bot (Webhook & No VPS Ready)

A Telegram Bot to download TeraBox video links, adapted to run **without a VPS** using Webhooks on free platforms like **Render**, **Vercel**, **Koyeb**, or **Railway**.

---

## ✨ Features

- ⚡ **No VPS Required**: Deploy on 100% free serverless or cloud platforms (Vercel, Render, Koyeb, Railway).
- 🔗 **Dual Operation Mode**:
  - **Webhook Mode**: When `WEBHOOK_URL` is configured, updates are delivered via Telegram Webhooks.
  - **Polling Mode Fallback**: If `WEBHOOK_URL` is omitted, the bot falls back automatically to long-polling for local testing.
- 🌐 **Express HTTP Server**:
  - `GET /` — Health check endpoint for uptime monitors (UptimeRobot, cron-job.org) to prevent sleeping on free tiers.
  - `POST /webhook` — Webhook receiver for Telegram updates.
  - `GET /set-webhook` — Easily configure the webhook in Telegram right from your browser.
  - `GET /webhook-info` — Inspect Telegram webhook status and pending update counts.
  - `GET /delete-webhook` — Clear the webhook to switch back to polling.
- 🛡️ **Flexible & Resilient**:
  - Non-crashing MongoDB handling (MongoDB is optional).
  - Broad domain matching (`1024terabox.com`, `terabox.com`, `teraboxapp.com`, `mirrobox.com`, `nephobox.com`, etc.).
  - Configurable force-subscription channel (`CHANNEL_USERNAME`).

---

## 🚀 Deployment Options (Without a VPS)

### Option 1: Deploy on Render (Recommended, Free Web Service)

1. Push this repository to your GitHub account.
2. Sign up or log in at [Render.com](https://render.com/).
3. Click **New +** -> **Web Service** and connect your GitHub repository.
4. Set the following settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. In **Environment Variables**, add:
   - `BOT_TOKEN`: Your Telegram Bot Token from [@BotFather](https://t.me/BotFather)
   - `WEBHOOK_URL`: Your Render service URL (e.g., `https://your-app-name.onrender.com`)
   - `MONGO_URI`: (Optional) MongoDB connection string
   - `CHANNEL_USERNAME`: (Optional) `@your_channel` if you want force-subscribe
6. Deploy the service! Once live, Render will automatically bind the port and the bot will set up the webhook on Telegram.
7. *(Optional)* Add your Render URL to a free monitor like [UptimeRobot](https://uptimerobot.com) to ping `https://your-app-name.onrender.com/` every 5 minutes to keep it active.

---

### Option 2: Deploy on Vercel (100% Serverless, No VPS)

1. Push this repository to your GitHub account.
2. Sign up or log in at [Vercel](https://vercel.com/).
3. Click **Add New** -> **Project** and import your repository.
4. In **Environment Variables**, add:
   - `BOT_TOKEN`: Your Telegram Bot Token
   - `MONGO_URI`: (Optional) MongoDB connection string
   - `CHANNEL_USERNAME`: (Optional) Channel username for force-sub
5. Click **Deploy**.
6. Once deployed, set the webhook by opening this URL in your browser:
   ```
   https://your-vercel-project.vercel.app/api?action=set
   ```
   You will receive a confirmation message that the Telegram webhook has been registered!

---

### Option 3: Local Development & Testing

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env`:
   ```env
   BOT_TOKEN=your_bot_token_here
   MONGO_URI=mongodb+srv://...
   PORT=3000
   ```
3. Run the bot:
   ```bash
   npm start
   ```
   If `WEBHOOK_URL` is empty, it runs in **polling mode** automatically.
4. To test webhooks locally:
   - Run `ngrok http 3000`
   - Set `WEBHOOK_URL=https://your-ngrok-subdomain.ngrok-free.app` in `.env`
   - Restart `npm start`

---

## 🛠️ Webhook Helper Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | `GET` | Health check & bot status report |
| `/webhook` | `POST` | Telegram update receiver |
| `/set-webhook` | `GET` | Automatically registers or updates the webhook with Telegram |
| `/webhook-info` | `GET` | Retrieves current webhook status and error info from Telegram |
| `/delete-webhook` | `GET` | Unregisters the webhook to re-enable polling mode |

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BOT_TOKEN` | **Yes** | — | Telegram Bot token from @BotFather |
| `WEBHOOK_URL` | No | `null` | Base public domain (e.g. `https://mybot.onrender.com`). If empty, runs in polling mode. |
| `WEBHOOK_PATH` | No | `/webhook` | Webhook URL path |
| `PORT` | No | `3000` | Port for the HTTP server |
| `MONGO_URI` | No | `null` | MongoDB connection string for tracking users |
| `CHANNEL_USERNAME` | No | `""` | Channel username for mandatory join requirement (leave blank to disable) |
| `TERABOX_API_URL` | No | `https://alphaapis.org/terabox/v3/dl?url=` | TeraBox video extraction API endpoint |
