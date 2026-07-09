# DayOS

DayOS is a personal dashboard for calendar blocks, memos, journal entries, photos, AI Agent messages, and Hermes/OpenClaw pushes.

## Local Development

```bash
npm install
npm run dev
```

Services:

- Web: `http://127.0.0.1:5175`
- API: `http://127.0.0.1:8787`
- Vite proxies `/api/*` to the API service.

## API Token

Set this before deploying:

```bash
export DAYOS_API_TOKEN="replace-with-a-long-random-token"
```

Hermes push example:

```bash
curl -X POST https://your-domain.com/api/agent/push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer replace-with-a-long-random-token" \
  -d '{
    "source": "Hermes",
    "title": "Hermes notification",
    "body": "This message was pushed to DayOS.",
    "category": "agent"
  }'
```

## Baota / BT Panel Deployment

Recommended layout:

```text
/www/wwwroot/dayos
  dist/
  server/
  data/
  package.json
  ecosystem.config.cjs
```

Steps:

1. Install Node.js in BT Panel.
2. Upload or clone this project to `/www/wwwroot/dayos`.
3. Run:

```bash
cd /www/wwwroot/dayos
npm install
npm run build
```

4. In BT PM2 Manager, start `ecosystem.config.cjs`.
5. Replace `change-this-token-before-deploy` in `ecosystem.config.cjs`.
6. In BT website config, set site root to `/www/wwwroot/dayos/dist`.
7. Add the Nginx proxy from `deploy/nginx-dayos.conf`.
8. Enable HTTPS in BT Panel.

## Apple Reminders Sync

The UI stores:

- iCloud Apple ID
- iCloud app-specific password
- Reminders list name

The API endpoint exists:

```http
POST /api/calendar/sync-reminders
```

Current mode is `dry-run`: it validates credentials and selected events, then returns what would be synced. Real Apple Reminders writing requires adding a server-side CalDAV/Reminders adapter.

Use an Apple app-specific password, not your normal iCloud password.

## Data Storage

Current API storage:

```text
data/dayos.json
```

This is ignored by git. For production, back up `data/` or migrate it to PostgreSQL.
