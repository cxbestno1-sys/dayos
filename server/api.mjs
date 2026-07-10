import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const dataFile = join(rootDir, 'data', 'dayos.json')
const port = Number(process.env.DAYOS_API_PORT || 8787)
const token = process.env.DAYOS_API_TOKEN || 'dayos-local-token'
const defaultUserEmail = process.env.DAYOS_DEFAULT_USER_EMAIL || 'test@dayos.local'
const journalDate = '2026-07-09'

const defaultState = {
  projects: [
    {
      id: 'project-words', title: '三个月背 3000 个单词', goal: '每天完成 34 个新词，并安排复习。', startDate: '2026-07-01', endDate: '2026-09-30',
      tasks: [{ id: 'word-1', date: '2026-07-09', title: '第 9 天：学习 34 个新词并复习昨日单词', done: false }],
    },
  ],
  journal: '上午：完成首页模块化。中午：记录午餐照片。下午：整理 AI Agent 接入方式。',
  photos: [],
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
    displayName: '',
    activeStart: '08:00',
    activeEnd: '22:00',
    onboardingComplete: false,
    icloudAppleId: '',
    icloudAppPassword: '',
    remindersListName: 'DayOS',
  },
}

const dbConfig = {
  host: process.env.DAYOS_DB_HOST,
  port: Number(process.env.DAYOS_DB_PORT || 3306),
  user: process.env.DAYOS_DB_USER,
  password: process.env.DAYOS_DB_PASSWORD,
  database: process.env.DAYOS_DB_NAME,
}

const dbEnabled = Boolean(dbConfig.host && dbConfig.user && dbConfig.database)
let pool
let dbFailed = false

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

function getPool() {
  if (!dbEnabled || dbFailed) return null
  pool ||= mysql.createPool({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    charset: 'utf8mb4',
    dateStrings: true,
  })
  return pool
}

async function withDb(action) {
  const currentPool = getPool()
  if (!currentPool) return null
  try {
    return await action(currentPool)
  } catch (error) {
    dbFailed = true
    console.warn('DayOS MySQL unavailable, falling back to JSON storage.', error)
    return null
  }
}

async function readJsonState() {
  try {
    const raw = await readFile(dataFile, 'utf8')
    const stored = JSON.parse(raw)
    return mergeState(stored)
  } catch {
    return structuredClone(defaultState)
  }
}

async function writeJsonState(state) {
  await mkdir(dirname(dataFile), { recursive: true })
  await writeFile(dataFile, JSON.stringify(mergeState(state), null, 2))
}

function mergeState(state) {
  return {
    ...defaultState,
    ...state,
    agentConfig: { ...defaultState.agentConfig, ...(state.agentConfig || {}) },
    settings: { ...defaultState.settings, ...(state.settings || {}) },
    projects: state.projects || defaultState.projects,
    journal: typeof state.journal === 'string' ? state.journal : defaultState.journal,
    photos: state.photos || defaultState.photos,
    calendarEvents: state.calendarEvents || defaultState.calendarEvents,
    agentInbox: state.agentInbox || defaultState.agentInbox,
  }
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

function normalizeBoolean(value) {
  return value === true || value === 1 || value === '1'
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

function normalizeProjects(projects) {
  if (!Array.isArray(projects)) return []
  return projects.map((project) => ({
    id: String(project.id || `project-${Date.now()}`),
    title: String(project.title || 'Untitled project'),
    goal: String(project.goal || ''),
    startDate: String(project.startDate || new Date().toISOString().slice(0, 10)),
    endDate: String(project.endDate || project.startDate || new Date().toISOString().slice(0, 10)),
    tasks: Array.isArray(project.tasks) ? project.tasks.map((task) => ({
      id: String(task.id || `task-${Date.now()}`), title: String(task.title || 'Untitled task'),
      date: String(task.date || project.startDate || new Date().toISOString().slice(0, 10)), done: normalizeBoolean(task.done),
    })) : [],
  }))
}

function normalizePhotos(photos) {
  if (!Array.isArray(photos)) return []
  return photos.map((photo) => ({
    id: String(photo.id || `photo-${Date.now()}`),
    label: String(photo.label || 'Photo'),
    note: String(photo.note || ''),
    src: String(photo.src || ''),
    createdAt: String(photo.createdAt || new Date().toISOString()),
  }))
}

function toMysqlDateTime(value) {
  const date = new Date(value)
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date
  return safeDate.toISOString().slice(0, 19).replace('T', ' ')
}

function normalizeSettings(settings) {
  return {
    ...defaultState.settings,
    ...settings,
    calendarSync: normalizeBoolean(settings.calendarSync),
    notesSync: normalizeBoolean(settings.notesSync),
    aiEnabled: normalizeBoolean(settings.aiEnabled),
    onboardingComplete: normalizeBoolean(settings.onboardingComplete),
  }
}

function dbSettingsFromRow(row) {
  if (!row) return defaultState.settings
  return normalizeSettings({
    defaultLanguage: row.default_language,
    calendarSync: row.calendar_sync,
    notesSync: row.notes_sync,
    photoStorage: row.photo_storage,
    aiEnabled: row.ai_enabled,
    displayName: row.display_name,
    activeStart: String(row.active_start || defaultState.settings.activeStart).slice(0, 5),
    activeEnd: String(row.active_end || defaultState.settings.activeEnd).slice(0, 5),
    onboardingComplete: row.onboarding_complete,
    icloudAppleId: row.icloud_apple_id,
    icloudAppPassword: row.icloud_app_password,
    remindersListName: row.reminders_list_name,
  })
}

function dbAgentConfigFromRow(row) {
  if (!row) return defaultState.agentConfig
  return {
    source: normalizeSource(row.source),
    webhookUrl: row.webhook_url || defaultState.agentConfig.webhookUrl,
    apiEndpoint: row.api_endpoint || defaultState.agentConfig.apiEndpoint,
    apiKey: row.api_key || '',
    model: row.model || defaultState.agentConfig.model,
    autoClassify: normalizeBoolean(row.auto_classify),
  }
}

async function ensureDefaultUser(db) {
  await db.execute(
    `INSERT INTO users (email, display_name)
     VALUES (:email, '')
     ON DUPLICATE KEY UPDATE email = VALUES(email)`,
    { email: defaultUserEmail },
  )
  const [rows] = await db.execute('SELECT id FROM users WHERE email = :email LIMIT 1', { email: defaultUserEmail })
  const userId = rows[0].id
  await db.execute(
    `INSERT INTO user_settings (user_id)
     VALUES (:userId)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
    { userId },
  )
  await db.execute(
    `INSERT INTO agent_configs (user_id)
     VALUES (:userId)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
    { userId },
  )
  return userId
}

async function readDbState() {
  return withDb(async (db) => {
    const userId = await ensureDefaultUser(db)
    const [settingsRows] = await db.execute('SELECT * FROM user_settings WHERE user_id = :userId LIMIT 1', { userId })
    const [agentConfigRows] = await db.execute('SELECT * FROM agent_configs WHERE user_id = :userId LIMIT 1', { userId })
    const [eventRows] = await db.execute('SELECT * FROM calendar_events WHERE user_id = :userId ORDER BY event_date, event_time, id', { userId })
    const [memoRows] = await db.execute('SELECT * FROM memos WHERE user_id = :userId ORDER BY sort_order, created_at, id', { userId })
    const [journalRows] = await db.execute('SELECT content FROM journal_entries WHERE user_id = :userId AND entry_date = :entryDate LIMIT 1', { userId, entryDate: journalDate })
    const [photoRows] = await db.execute('SELECT * FROM photos WHERE user_id = :userId ORDER BY created_at DESC, id DESC', { userId })
    const [messageRows] = await db.execute('SELECT * FROM agent_messages WHERE user_id = :userId ORDER BY created_at DESC, id DESC LIMIT 200', { userId })

    return mergeState({
      settings: dbSettingsFromRow(settingsRows[0]),
      agentConfig: dbAgentConfigFromRow(agentConfigRows[0]),
      calendarEvents: eventRows.map((event) => ({
        id: event.external_id,
        date: event.event_date,
        time: String(event.event_time || '09:00:00').slice(0, 5),
        title: event.title,
        category: normalizeCategory(event.category),
        progress: Number(event.progress || 0),
      })),
      memos: memoRows.map((memo) => ({
        id: memo.external_id,
        title: memo.title,
        body: memo.body,
      })),
      journal: journalRows[0]?.content || defaultState.journal,
      photos: photoRows.map((photo) => ({
        id: photo.external_id,
        label: photo.label,
        note: photo.note || '',
        src: photo.src,
        createdAt: photo.created_at instanceof Date ? photo.created_at.toISOString() : String(photo.created_at),
      })),
      agentInbox: messageRows.map((message) => ({
        id: message.external_id,
        source: normalizeSource(message.source),
        title: message.title,
        body: message.body || '',
        category: normalizeCategory(message.category),
        createdAt: message.created_at instanceof Date ? message.created_at.toISOString() : String(message.created_at),
      })),
    })
  })
}

async function readState() {
  const dbState = await readDbState()
  if (!dbState) return readJsonState()
  const jsonState = await readJsonState()
  return { ...dbState, projects: jsonState.projects }
}

async function replaceCalendarEvents(events) {
  const normalized = normalizeCalendarEvents(events)
  const saved = await withDb(async (db) => {
    const userId = await ensureDefaultUser(db)
    await db.execute('DELETE FROM calendar_events WHERE user_id = :userId', { userId })
    for (const event of normalized) {
      await db.execute(
        `INSERT INTO calendar_events (user_id, external_id, event_date, event_time, title, category, progress)
         VALUES (:userId, :id, :date, :time, :title, :category, :progress)`,
        { userId, ...event },
      )
    }
    return normalized
  })
  if (saved) return saved

  const state = await readJsonState()
  await writeJsonState({ ...state, calendarEvents: normalized })
  return normalized
}

async function replaceProjects(projects) {
  const normalized = normalizeProjects(projects)
  const state = await readJsonState()
  await writeJsonState({ ...state, projects: normalized })
  return normalized
}

async function saveJournal(content, entryDate = journalDate) {
  const journal = String(content || '')
  const saved = await withDb(async (db) => {
    const userId = await ensureDefaultUser(db)
    await db.execute(
      `INSERT INTO journal_entries (user_id, entry_date, content)
       VALUES (:userId, :entryDate, :content)
       ON DUPLICATE KEY UPDATE content = VALUES(content), updated_at = CURRENT_TIMESTAMP`,
      { userId, entryDate, content: journal },
    )
    return journal
  })
  if (saved !== null) return saved

  const state = await readJsonState()
  await writeJsonState({ ...state, journal })
  return journal
}

async function replacePhotos(photos) {
  const normalized = normalizePhotos(photos)
  const saved = await withDb(async (db) => {
    const userId = await ensureDefaultUser(db)
    await db.execute('DELETE FROM photos WHERE user_id = :userId', { userId })
    for (const photo of normalized) {
      await db.execute(
        `INSERT INTO photos (user_id, external_id, label, note, src, created_at)
         VALUES (:userId, :id, :label, :note, :src, :createdAt)`,
        { userId, ...photo, createdAt: toMysqlDateTime(photo.createdAt) },
      )
    }
    return normalized
  })
  if (saved) return saved

  const state = await readJsonState()
  await writeJsonState({ ...state, photos: normalized })
  return normalized
}

async function analyzePhotoWithAi({ src, label, note }, config) {
  if (!config?.apiKey || !config?.apiEndpoint) {
    throw new Error('AI endpoint and API key are required for photo analysis')
  }

  const response = await fetch(`${String(config.apiEndpoint).replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4.1-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You identify personal photos. Return only JSON with string fields label and note. For food, estimate calories as a range and name the food. For scenes, describe the likely place or landmark only when visually supported; otherwise say the location is unknown. Respond in the user\'s language when possible.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Existing label: ${String(label || '')}. Existing note: ${String(note || '')}. Analyze this image for a personal photo log.` },
            { type: 'image_url', image_url: { url: String(src) } },
          ],
        },
      ],
    }),
  })
  if (!response.ok) throw new Error(`AI photo analysis failed: ${response.status}`)
  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('AI photo analysis returned no content')
  const parsed = JSON.parse(content.replace(/^```json\s*|\s*```$/g, ''))
  return {
    label: String(parsed.label || label || 'Photo'),
    note: String(parsed.note || note || ''),
  }
}

async function saveAgentConfig(config) {
  const nextConfig = { ...defaultState.agentConfig, ...config, source: normalizeSource(config.source), autoClassify: normalizeBoolean(config.autoClassify) }
  const saved = await withDb(async (db) => {
    const userId = await ensureDefaultUser(db)
    await db.execute(
      `INSERT INTO agent_configs (user_id, source, webhook_url, api_endpoint, api_key, model, auto_classify)
       VALUES (:userId, :source, :webhookUrl, :apiEndpoint, :apiKey, :model, :autoClassify)
       ON DUPLICATE KEY UPDATE
        source = VALUES(source),
        webhook_url = VALUES(webhook_url),
        api_endpoint = VALUES(api_endpoint),
        api_key = VALUES(api_key),
        model = VALUES(model),
        auto_classify = VALUES(auto_classify)`,
      { userId, ...nextConfig },
    )
    return nextConfig
  })
  if (saved) return saved

  const state = await readJsonState()
  await writeJsonState({ ...state, agentConfig: nextConfig })
  return nextConfig
}

async function saveSettings(settings) {
  const nextSettings = normalizeSettings(settings)
  const saved = await withDb(async (db) => {
    const userId = await ensureDefaultUser(db)
    await db.execute(
      `INSERT INTO user_settings (
        user_id, default_language, calendar_sync, notes_sync, photo_storage, ai_enabled,
        display_name, active_start, active_end, onboarding_complete,
        icloud_apple_id, icloud_app_password, reminders_list_name
      )
      VALUES (
        :userId, :defaultLanguage, :calendarSync, :notesSync, :photoStorage, :aiEnabled,
        :displayName, :activeStart, :activeEnd, :onboardingComplete,
        :icloudAppleId, :icloudAppPassword, :remindersListName
      )
      ON DUPLICATE KEY UPDATE
        default_language = VALUES(default_language),
        calendar_sync = VALUES(calendar_sync),
        notes_sync = VALUES(notes_sync),
        photo_storage = VALUES(photo_storage),
        ai_enabled = VALUES(ai_enabled),
        display_name = VALUES(display_name),
        active_start = VALUES(active_start),
        active_end = VALUES(active_end),
        onboarding_complete = VALUES(onboarding_complete),
        icloud_apple_id = VALUES(icloud_apple_id),
        icloud_app_password = VALUES(icloud_app_password),
        reminders_list_name = VALUES(reminders_list_name)`,
      { userId, ...nextSettings },
    )
    await db.execute('UPDATE users SET display_name = :displayName WHERE id = :userId', { userId, displayName: nextSettings.displayName })
    return nextSettings
  })
  if (saved) return saved

  const state = await readJsonState()
  await writeJsonState({ ...state, settings: nextSettings })
  return nextSettings
}

async function pushAgentMessage(message) {
  const nextMessage = {
    id: String(message.id || `agent-message-${Date.now()}`),
    source: normalizeSource(message.source),
    title: String(message.title || 'Untitled Agent message'),
    body: String(message.body || ''),
    category: normalizeCategory(message.category),
    createdAt: String(message.createdAt || new Date().toISOString()),
  }
  const saved = await withDb(async (db) => {
    const userId = await ensureDefaultUser(db)
    await db.execute(
      `INSERT INTO agent_messages (user_id, external_id, source, title, body, category, created_at)
       VALUES (:userId, :id, :source, :title, :body, :category, :createdAt)`,
      { userId, ...nextMessage, createdAt: toMysqlDateTime(nextMessage.createdAt) },
    )
    return nextMessage
  })
  if (saved) return saved

  const state = await readJsonState()
  await writeJsonState({ ...state, agentInbox: [nextMessage, ...state.agentInbox].slice(0, 200) })
  return nextMessage
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
      json(res, 200, { ok: true, service: 'dayos-api', storage: dbEnabled && !dbFailed ? 'mysql' : 'json' })
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
      json(res, 200, { events: await replaceCalendarEvents(body.events) })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/projects') {
      json(res, 200, { projects: state.projects || [] })
      return
    }

    if (req.method === 'PUT' && url.pathname === '/api/projects') {
      const body = await readBody(req)
      json(res, 200, { projects: await replaceProjects(body.projects) })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/journal') {
      json(res, 200, { journal: state.journal || '' })
      return
    }

    if (req.method === 'PUT' && url.pathname === '/api/journal') {
      const body = await readBody(req)
      json(res, 200, { journal: await saveJournal(body.journal, body.date || journalDate) })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/photos') {
      json(res, 200, { photos: state.photos || [] })
      return
    }

    if (req.method === 'PUT' && url.pathname === '/api/photos') {
      const body = await readBody(req)
      json(res, 200, { photos: await replacePhotos(body.photos) })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/photos/analyze') {
      const body = await readBody(req)
      json(res, 200, await analyzePhotoWithAi(body, state.agentConfig))
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
      json(res, 201, { message: await pushAgentMessage(body) })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/agent/config') {
      json(res, 200, { config: state.agentConfig })
      return
    }

    if (req.method === 'PUT' && url.pathname === '/api/agent/config') {
      const body = await readBody(req)
      json(res, 200, { config: await saveAgentConfig({ ...state.agentConfig, ...body }) })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/settings') {
      json(res, 200, { settings: state.settings })
      return
    }

    if (req.method === 'PUT' && url.pathname === '/api/settings') {
      const body = await readBody(req)
      json(res, 200, { settings: await saveSettings({ ...state.settings, ...body }) })
      return
    }

    json(res, 404, { error: 'Not found' })
  } catch (error) {
    json(res, 500, { error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

server.listen(port, () => {
  console.log(`DayOS API listening on http://127.0.0.1:${port}`)
  console.log(`DayOS storage: ${dbEnabled ? 'mysql' : 'json fallback'}`)
  console.log(`Hermes token for local dev: ${token}`)
})
