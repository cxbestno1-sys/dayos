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

Set these before deploying:

```bash
export DAYOS_API_TOKEN="replace-with-a-long-random-token"
export DAYOS_DB_HOST="127.0.0.1"
export DAYOS_DB_PORT="3306"
export DAYOS_DB_USER="dayos"
export DAYOS_DB_PASSWORD="your-db-password"
export DAYOS_DB_NAME="dayos"
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
  deploy/mysql-schema.sql
  package.json
  ecosystem.config.cjs
```

Steps:

1. Install Node.js in BT Panel.
2. Install MySQL in BT Panel.
3. Create a MySQL database named `dayos`, then import `deploy/mysql-schema.sql`.
4. Upload or clone this project to `/www/wwwroot/dayos`.
5. Run:

```bash
cd /www/wwwroot/dayos
npm install
npm run build
```

6. Replace `change-this-token-before-deploy` and MySQL credentials in `ecosystem.config.cjs`.
7. In BT PM2 Manager, start `ecosystem.config.cjs`.
8. In BT website config, set site root to `/www/wwwroot/dayos/dist`.
9. Add the Nginx proxy from `deploy/nginx-dayos.conf`.
10. Enable HTTPS in BT Panel.

Health check:

```bash
curl http://127.0.0.1:8787/api/health
```

With MySQL enabled it should include:

```json
{"storage":"mysql"}
```

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

Production storage is MySQL when these environment variables are set:

```bash
DAYOS_DB_HOST
DAYOS_DB_PORT
DAYOS_DB_USER
DAYOS_DB_PASSWORD
DAYOS_DB_NAME
```

Tables are defined in:

```text
deploy/mysql-schema.sql
```

If MySQL is not configured or is unavailable, the API falls back to local JSON:

```text
data/dayos.json
```

Use the JSON fallback only for local development or emergency recovery. For production, keep MySQL backups enabled in BT Panel.
