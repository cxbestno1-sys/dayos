import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const dataFile = join(rootDir, 'data', 'dayos.json')
const port = Number(process.env.DAYOS_API_PORT || 8787)
const token = process.env.DAYOS_API_TOKEN || 'dayos-local-token'

const defaultState = {
  calendarEvents: [
    { id: 'event-1', date: '2026-07-09', time: '09:00', title: 'DayOS 架构深度工作', category: 'work', progress: 88 },
    { id: 'event-2', date: '2026-07-09', time: '11:30', title: '检查 AI Agent Webhook 格式', category: 'agent', progress: 62 },
    { id: 'event-3', date: '2026-07-09', time: '13:00', title: '午餐照片和日记记录', category: 'life', progress: 35 },
  ],
  agentConfig: {
    source: 'Hermes',
    webhookUrl: '/api/agent/push',
    apiEndpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4.1-mini',
    autoClassify: true,
  },
  agentInbox: [
    {
      id: 'agent-message-1',
      source: 'Hermes',
      title: 'Hermes 推送：构建完成',
      body: '本地 DayOS API 已启动，可以接收真实 webhook。',
      category: 'agent',
      createdAt: '2026-07-08 14:30',
    },
  ],
  settings: {
    defaultLanguage: 'zh',
    calendarSync: false,
    notesSync: false,
    photoStorage: 'local',
    aiEnabled: true,
    icloudAppleId: '',
    icloudAppPassword: '',
    remindersListName: 'DayOS',
  },
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(payload))
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  return JSON.parse(raw)
}

async function readState() {
  try {
    const raw = await readFile(dataFile, 'utf8')
    const stored = JSON.parse(raw)
    return {
      ...defaultState,
      ...stored,
      agentConfig: { ...defaultState.agentConfig, ...(stored.agentConfig || {}) },
      settings: { ...defaultState.settings, ...(stored.settings || {}) },
      calendarEvents: stored.calendarEvents || defaultState.calendarEvents,
      agentInbox: stored.agentInbox || defaultState.agentInbox,
    }
  } catch {
    return structuredClone(defaultState)
  }
}

async function writeState(state) {
  await mkdir(dirname(dataFile), { recursive: true })
  await writeFile(dataFile, JSON.stringify(state, null, 2))
}

function isAuthorized(req) {
  const auth = req.headers.authorization || ''
  return auth === `Bearer ${token}`
}

function normalizeCategory(category) {
  return ['work', 'life', 'health', 'agent'].includes(category) ? category : 'agent'
}

function normalizeSource(source) {
  return source === 'OpenClaw' ? 'OpenClaw' : 'Hermes'
}

function normalizeCalendarEvents(events) {
  if (!Array.isArray(events)) return []
  return events.map((event) => ({
    id: String(event.id || `event-${Date.now()}`),
    date: String(event.date || new Date().toISOString().slice(0, 10)),
    time: String(event.time || '09:00'),
    title: String(event.title || 'Untitled event'),
    category: normalizeCategory(event.category),
    progress: Math.max(0, Math.min(100, Number(event.progress || 0))),
  }))
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      json(res, 204, {})
      return
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    const state = await readState()

    if (req.method === 'GET' && url.pathname === '/api/health') {
      json(res, 200, { ok: true, service: 'dayos-api' })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/agent/messages') {
      json(res, 200, { messages: state.agentInbox })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/calendar/events') {
      json(res, 200, { events: state.calendarEvents || [] })
      return
    }

    if (req.method === 'PUT' && url.pathname === '/api/calendar/events') {
      const body = await readBody(req)
      const nextState = {
        ...state,
        calendarEvents: normalizeCalendarEvents(body.events),
      }
      await writeState(nextState)
      json(res, 200, { events: nextState.calendarEvents })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/calendar/sync-reminders') {
      if (!isAuthorized(req)) {
        json(res, 401, { error: 'Unauthorized' })
        return
      }

      const body = await readBody(req)
      const events = normalizeCalendarEvents(body.events || state.calendarEvents || [])
      const credentials = body.credentials || state.settings || {}

      if (!credentials.icloudAppleId || !credentials.icloudAppPassword) {
        json(res, 400, {
          error: 'Missing iCloud credentials',
          message: 'Provide Apple ID and app-specific password before syncing to Apple Reminders.',
        })
        return
      }

      json(res, 202, {
        ok: true,
        provider: 'apple-reminders',
        mode: 'dry-run',
        syncedCount: events.length,
        listName: credentials.remindersListName || 'DayOS',
        message: 'Apple Reminders sync endpoint is wired. Install a CalDAV/reminders adapter on the server to perform real writes.',
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/agent/push') {
      if (!isAuthorized(req)) {
        json(res, 401, { error: 'Unauthorized' })
        return
      }

      const body = await readBody(req)
      const message = {
        id: `agent-message-${Date.now()}`,
        source: normalizeSource(body.source),
        title: String(body.title || 'Untitled Agent message'),
        body: String(body.body || ''),
        category: normalizeCategory(body.category),
        createdAt: String(body.createdAt || new Date().toISOString()),
      }

      const nextState = {
        ...state,
        agentInbox: [message, ...state.agentInbox].slice(0, 200),
      }
      await writeState(nextState)
      json(res, 201, { message })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/agent/config') {
      json(res, 200, { config: state.agentConfig })
      return
    }

    if (req.method === 'PUT' && url.pathname === '/api/agent/config') {
      const body = await readBody(req)
      const nextState = {
        ...state,
        agentConfig: { ...state.agentConfig, ...body },
      }
      await writeState(nextState)
      json(res, 200, { config: nextState.agentConfig })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/settings') {
      json(res, 200, { settings: state.settings })
      return
    }

    if (req.method === 'PUT' && url.pathname === '/api/settings') {
      const body = await readBody(req)
      const nextState = {
        ...state,
        settings: { ...state.settings, ...body },
      }
      await writeState(nextState)
      json(res, 200, { settings: nextState.settings })
      return
    }

    json(res, 404, { error: 'Not found' })
  } catch (error) {
    json(res, 500, { error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

server.listen(port, () => {
  console.log(`DayOS API listening on http://127.0.0.1:${port}`)
  console.log(`Hermes token for local dev: ${token}`)
})
