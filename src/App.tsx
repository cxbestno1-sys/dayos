import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import './App.css'

type Lang = 'zh' | 'en'
type Page = 'today' | 'calendar' | 'memo' | 'journal' | 'photos' | 'agent' | 'settings'
type ViewMode = 'work' | 'life' | 'review'
type WidgetSize = 'compact' | 'wide' | 'tall'
type Category = 'work' | 'life' | 'health' | 'agent'
type WidgetId = 'timeline' | 'tasks' | 'agent' | 'memo' | 'journal' | 'photos' | 'health' | 'summary'
type LoginScene = 'morning' | 'noon' | 'evening' | 'night'

type Widget = {
  id: WidgetId
  size: WidgetSize
  enabled: boolean
}

type CalendarEvent = {
  id: string
  date: string
  time: string
  title: string
  category: Category
  progress: number
}

type MemoItem = {
  id: string
  title: string
  body: string
}

type PhotoItem = {
  id: string
  label: string
  note: string
  src: string
  createdAt: string
}

type AgentInboxItem = {
  id: string
  source: 'Hermes' | 'OpenClaw'
  title: string
  body: string
  category: Category
  createdAt: string
}

type AgentConfig = {
  source: 'Hermes' | 'OpenClaw'
  webhookUrl: string
  apiEndpoint: string
  apiKey: string
  model: string
  autoClassify: boolean
}

type DayOSSettings = {
  defaultLanguage: Lang
  calendarSync: boolean
  notesSync: boolean
  photoStorage: 'local' | 'cloud'
  aiEnabled: boolean
  icloudAppleId: string
  icloudAppPassword: string
  remindersListName: string
}

type IconName =
  | 'calendar'
  | 'check'
  | 'edit'
  | 'heart'
  | 'image'
  | 'layout'
  | 'lock'
  | 'message'
  | 'note'
  | 'plus'
  | 'send'
  | 'spark'
  | 'sun'
  | 'user'
  | 'settings'

const text = {
  zh: {
    signIn: '登录 DayOS',
    privateBeta: '私人工作台',
    loginSubtitle: '管理日历、备忘录、日记、照片、AI Agent 和自动排程。',
    enter: '进入工作台',
    email: '邮箱',
    password: '密码',
    today: '今日',
    calendar: '日历',
    memo: '备忘录',
    journal: '日记',
    photos: '照片',
    agent: 'AI Agent',
    settings: '设置',
    commandCenter: '个人中枢',
    greeting: '下午好，Cheng。',
    date: '2026年7月9日，星期四',
    livePlan: '今日动态计划',
    statusHeadline: '4 个日程，6 个任务，3 条新记录',
    statusCopy: '今日首页会同步读取日历、备忘录、日记、照片和 AI Agent 的最新保存内容。',
    dayProgress: '今日进度',
    commandPlaceholder: '告诉 DayOS 要安排、记录或总结什么...',
    aiDefault: '把粗略安排发给 DayOS，它会拆成日历、备忘录、日记和 Agent 任务。',
    aiEmpty: '试试：“明天下午三点开会，晚上健身，中午记录午餐照片。”',
    draftCreated: '已生成草稿',
    work: '工作',
    life: '生活',
    review: '复盘',
    customize: '自定义首页',
    add: '新建',
    profile: '个人资料',
    customizeTitle: '选择首页模块并调整尺寸。',
    appleBridge: 'Apple Calendar / Notes 桥接将在第二阶段接入。',
    source: '来源',
    progressLegend: '进度颜色',
    redWork: '红色：工作',
    blueLife: '蓝色：生活',
    healthGreen: '绿色：健康',
    agentPurple: '紫色：Agent',
  },
  en: {
    signIn: 'Sign in to DayOS',
    privateBeta: 'Private workspace',
    loginSubtitle: 'Manage calendar, memo, journal, photos, AI Agent, and scheduling.',
    enter: 'Enter workspace',
    email: 'Email',
    password: 'Password',
    today: 'Today',
    calendar: 'Calendar',
    memo: 'Memo',
    journal: 'Journal',
    photos: 'Photos',
    agent: 'AI Agent',
    settings: 'Settings',
    commandCenter: 'Personal command center',
    greeting: 'Good afternoon, Cheng.',
    date: 'Thursday, July 9, 2026',
    livePlan: 'Live day plan',
    statusHeadline: '4 events, 6 tasks, 3 fresh notes',
    statusCopy: 'Today home syncs with the latest saved calendar, memos, journal, photos, and AI Agent data.',
    dayProgress: 'Day progress',
    commandPlaceholder: 'Tell DayOS what to arrange, record, or summarize...',
    aiDefault: 'Send a rough plan and DayOS will turn it into calendar blocks, notes, journal entries, and Agent tasks.',
    aiEmpty: 'Try: "Tomorrow 3pm meeting, gym at night, save lunch photo."',
    draftCreated: 'Draft created',
    work: 'Work',
    life: 'Life',
    review: 'Review',
    customize: 'Customize home',
    add: 'Add',
    profile: 'Profile',
    customizeTitle: 'Choose modules and cycle their size.',
    appleBridge: 'Apple Calendar / Notes bridge is planned for phase two.',
    source: 'Source',
    progressLegend: 'Progress colors',
    redWork: 'Red: work',
    blueLife: 'Blue: life',
    healthGreen: 'Green: health',
    agentPurple: 'Purple: agent',
  },
} satisfies Record<Lang, Record<string, string>>

const widgetLabels = {
  zh: {
    timeline: ['今日时间线', '日程'],
    tasks: ['事项进度', '计划'],
    agent: ['AI Agent 消息', 'Hermes / OpenClaw'],
    memo: ['快速备忘录', '备忘'],
    journal: ['每日记录', '日记'],
    photos: ['照片记录', '生活'],
    health: ['能量状态', 'HealthKit 预留'],
    summary: ['AI 复盘', '总结'],
  },
  en: {
    timeline: ['Today Timeline', 'Schedule'],
    tasks: ['Progress Tasks', 'Plan'],
    agent: ['AI Agent Inbox', 'Hermes / OpenClaw'],
    memo: ['Quick Memo', 'Notes'],
    journal: ['Daily Journal', 'Log'],
    photos: ['Photo Log', 'Life'],
    health: ['Energy Check', 'Health ready'],
    summary: ['AI Recap', 'Review'],
  },
} satisfies Record<Lang, Record<WidgetId, [string, string]>>

const widgetsSeed: Widget[] = [
  { id: 'timeline', size: 'wide', enabled: true },
  { id: 'tasks', size: 'compact', enabled: true },
  { id: 'agent', size: 'compact', enabled: true },
  { id: 'memo', size: 'compact', enabled: true },
  { id: 'journal', size: 'wide', enabled: true },
  { id: 'photos', size: 'compact', enabled: true },
  { id: 'health', size: 'compact', enabled: false },
  { id: 'summary', size: 'wide', enabled: true },
]

const defaultCalendarEvents: CalendarEvent[] = [
  { id: 'event-1', date: '2026-07-09', time: '09:00', title: 'DayOS 架构深度工作', category: 'work', progress: 88 },
  { id: 'event-2', date: '2026-07-09', time: '11:30', title: '检查 AI Agent Webhook 格式', category: 'agent', progress: 62 },
  { id: 'event-3', date: '2026-07-09', time: '13:00', title: '午餐照片和日记记录', category: 'life', progress: 35 },
  { id: 'event-4', date: '2026-07-10', time: '10:00', title: '整理宝塔部署配置', category: 'work', progress: 10 },
]

const defaultMemos: MemoItem[] = [
  { id: 'memo-1', title: 'DayOS API', body: '设计日历、备忘录、日记、照片和 AI Agent 的数据接口。' },
  { id: 'memo-2', title: 'Apple Notes bridge', body: '第二阶段用 macOS helper 或 AppleScript 做同步桥接。' },
  { id: 'memo-3', title: 'AI scheduling rules', body: '用户确认后再写入日历，避免 AI 自动覆盖安排。' },
]

const defaultJournal = '上午：完成首页模块化。中午：记录午餐照片。下午：整理 AI Agent 接入方式。'

const defaultPhotos: PhotoItem[] = []

const defaultAgentInbox: AgentInboxItem[] = [
  {
    id: 'agent-message-1',
    source: 'Hermes',
    title: 'Hermes 推送：构建完成',
    body: '本地 DayOS Web 构建已完成，可以继续接入真实 webhook。',
    category: 'agent',
    createdAt: '2026-07-08 14:30',
  },
  {
    id: 'agent-message-2',
    source: 'OpenClaw',
    title: 'OpenClaw：会议移动到 15:30',
    body: '收到 OpenClaw 推送，建议更新日历中的下午工作块。',
    category: 'work',
    createdAt: '2026-07-08 15:05',
  },
]

const defaultAgentConfig: AgentConfig = {
  source: 'Hermes',
  webhookUrl: '/api/agent/push',
  apiEndpoint: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4.1-mini',
  autoClassify: true,
}

const defaultDayOSSettings: DayOSSettings = {
  defaultLanguage: 'zh',
  calendarSync: false,
  notesSync: false,
  photoStorage: 'local',
  aiEnabled: true,
  icloudAppleId: '',
  icloudAppPassword: '',
  remindersListName: 'DayOS',
}

const dayosToday = '2026-07-09'

const dayosApiToken = 'dayos-local-token'
const testLogin = {
  email: 'test@dayos.local',
  code: '123456',
}

async function apiJson<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`)
  return response.json() as Promise<T>
}

function getInitialLoginScene(): LoginScene {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 10) return 'morning'
  if (hour >= 10 && hour < 16) return 'noon'
  if (hour >= 16 && hour < 19) return 'evening'
  return 'night'
}

const iconPaths: Record<IconName, string> = {
  calendar: 'M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  check: 'm5 13 4 4L19 7',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z',
  image: 'M4 5h16v14H4zM8 13l2.5-2.5L14 14l2-2 4 4M8 8h.01',
  layout: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v10H6z',
  message: 'M4 5h16v11H8l-4 4V5Z',
  note: 'M6 3h9l3 3v15H6zM14 3v4h4M9 11h6M9 15h6',
  plus: 'M12 5v14M5 12h14',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z',
  spark: 'M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2ZM5 17l.8 2.2L8 20l-2.2.8L5 23l-.8-2.2L2 20l2.2-.8L5 17Z',
  sun: 'M12 4V2M12 22v-2M4.9 4.9 3.5 3.5M20.5 20.5l-1.4-1.4M4 12H2M22 12h-2M4.9 19.1l-1.4 1.4M20.5 3.5l-1.4 1.4M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z',
  user: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 0 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 0 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 0 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z',
}

function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={iconPaths[name]} />
    </svg>
  )
}

function useLocalStore<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored ? (JSON.parse(stored) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const save = useCallback((nextValue: T) => {
    setValue(nextValue)
    window.localStorage.setItem(key, JSON.stringify(nextValue))
  }, [key])

  return [value, save] as const
}

function App() {
  const [signedIn, setSignedIn] = useState(false)
  const [lang, setLang] = useState<Lang>('zh')
  const [page, setPage] = useState<Page>('today')
  const [editMode, setEditMode] = useState(false)
  const [mode, setMode] = useState<ViewMode>('work')
  const [widgets, setWidgets] = useState(widgetsSeed)
  const [prompt, setPrompt] = useState('')
  const [agentSource, setAgentSource] = useState<'Hermes' | 'OpenClaw'>('Hermes')
  const [aiDraft, setAiDraft] = useState(text.zh.aiDefault)
  const [calendarEvents, saveCalendarEvents] = useLocalStore('dayos.calendarEvents', defaultCalendarEvents)
  const [memos, saveMemos] = useLocalStore('dayos.memos', defaultMemos)
  const [journal, saveJournal] = useLocalStore('dayos.journal.2026-07-08', defaultJournal)
  const [photos, savePhotos] = useLocalStore('dayos.photos', defaultPhotos)
  const [agentInbox, saveAgentInbox] = useLocalStore('dayos.agentInbox', defaultAgentInbox)
  const [agentConfig, saveAgentConfig] = useLocalStore('dayos.agentConfig', defaultAgentConfig)
  const [dayOSSettings, saveDayOSSettings] = useLocalStore('dayos.settings', defaultDayOSSettings)
  const t = text[lang]

  useEffect(() => {
    if (!signedIn) return
    let active = true

    async function loadApiState() {
      try {
        const [messages, config, settings, calendar] = await Promise.all([
          apiJson<{ messages: AgentInboxItem[] }>('/api/agent/messages'),
          apiJson<{ config: AgentConfig }>('/api/agent/config'),
          apiJson<{ settings: DayOSSettings }>('/api/settings'),
          apiJson<{ events: CalendarEvent[] }>('/api/calendar/events'),
        ])
        if (!active) return
        saveAgentInbox(messages.messages)
        saveAgentConfig(config.config)
        saveDayOSSettings(settings.settings)
        saveCalendarEvents(calendar.events)
        setAgentSource(config.config.source)
      } catch (error) {
        console.warn('DayOS API unavailable, using local state.', error)
      }
    }

    loadApiState()
    return () => {
      active = false
    }
  }, [signedIn, saveAgentInbox, saveAgentConfig, saveCalendarEvents, saveDayOSSettings])

  const visibleWidgets = useMemo(
    () =>
      widgets.filter((widget) => {
        if (!widget.enabled) return false
        if (mode === 'life') return widget.id !== 'agent'
        if (mode === 'review') return ['journal', 'summary', 'photos', 'timeline'].includes(widget.id)
        return true
      }),
    [mode, widgets],
  )

  function changeLanguage(nextLang: Lang) {
    setLang(nextLang)
    setAiDraft(text[nextLang].aiDefault)
  }

  function toggleWidget(id: WidgetId) {
    setWidgets((current) => current.map((widget) => (widget.id === id ? { ...widget, enabled: !widget.enabled } : widget)))
  }

  function cycleWidgetSize(id: WidgetId) {
    const next: Record<WidgetSize, WidgetSize> = { compact: 'wide', wide: 'tall', tall: 'compact' }
    setWidgets((current) => current.map((widget) => (widget.id === id ? { ...widget, size: next[widget.size] } : widget)))
  }

  function handleAiSubmit() {
    const cleanPrompt = prompt.trim()
    if (!cleanPrompt) {
      setAiDraft(t.aiEmpty)
      return
    }
    setAiDraft(`${t.draftCreated}: "${cleanPrompt}". ${agentSource} -> calendar, memo, journal, task.`)
    setPrompt('')
  }

  async function saveCalendarEventsToApi(events: CalendarEvent[]) {
    try {
      const result = await apiJson<{ events: CalendarEvent[] }>('/api/calendar/events', {
        body: JSON.stringify({ events }),
        method: 'PUT',
      })
      saveCalendarEvents(result.events)
    } catch (error) {
      saveCalendarEvents(events)
      console.warn('Calendar API unavailable, saved locally.', error)
    }
  }

  if (!signedIn) {
    return <LoginScreen lang={lang} onLanguage={changeLanguage} onSignIn={() => setSignedIn(true)} />
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="DayOS navigation">
        <div className="brand-lockup">
          <span className="brand-mark">D</span>
          <div>
            <strong>DayOS</strong>
            <span>{t.commandCenter}</span>
          </div>
        </div>

        <nav className="nav-list">
          <NavItem active={page === 'today'} icon="sun" label={t.today} onClick={() => setPage('today')} />
          <NavItem active={page === 'calendar'} icon="calendar" label={t.calendar} onClick={() => setPage('calendar')} />
          <NavItem active={page === 'memo'} icon="note" label={t.memo} onClick={() => setPage('memo')} />
          <NavItem active={page === 'journal'} icon="edit" label={t.journal} onClick={() => setPage('journal')} />
          <NavItem active={page === 'photos'} icon="image" label={t.photos} onClick={() => setPage('photos')} />
          <NavItem active={page === 'agent'} icon="message" label={t.agent} onClick={() => setPage('agent')} />
          <NavItem active={page === 'settings'} icon="settings" label={t.settings} onClick={() => setPage('settings')} />
        </nav>

        <div className="sync-panel">
          <div className="sync-orbit" />
          <p>{t.appleBridge}</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{t.date}</p>
            <h1>{page === 'today' ? t.greeting : pageTitle(page, lang)}</h1>
          </div>
          <div className="topbar-actions">
            <button className="lang-button" type="button" onClick={() => changeLanguage(lang === 'zh' ? 'en' : 'zh')}>
              {lang === 'zh' ? '中文' : 'EN'}
            </button>
            {page === 'today' && (
              <button className={`icon-button ${editMode ? 'selected' : ''}`} type="button" title={t.customize} onClick={() => setEditMode((value) => !value)}>
                <Icon name="layout" />
              </button>
            )}
            <button className="icon-button" type="button" title={t.add}>
              <Icon name="plus" />
            </button>
            <button className="avatar-button" type="button" title={t.profile}>
              <Icon name="user" />
            </button>
          </div>
        </header>

        {page === 'today' ? (
          <TodayPage
            aiDraft={aiDraft}
            agentSource={agentSource}
            agentInbox={agentInbox}
            calendarEvents={calendarEvents}
            editMode={editMode}
            journal={journal}
            lang={lang}
            memos={memos}
            mode={mode}
            photos={photos}
            prompt={prompt}
            t={t}
            visibleWidgets={visibleWidgets}
            widgets={widgets}
            onAgentSource={setAgentSource}
            onCycleWidgetSize={cycleWidgetSize}
            onNavigate={setPage}
            onMode={setMode}
            onPrompt={setPrompt}
            onSubmit={handleAiSubmit}
            onToggleWidget={toggleWidget}
          />
        ) : (
          <ModulePage
            agentConfig={agentConfig}
            agentInbox={agentInbox}
            calendarEvents={calendarEvents}
            dayOSSettings={dayOSSettings}
            journal={journal}
            lang={lang}
            memos={memos}
            page={page}
            photos={photos}
            onAgentSource={setAgentSource}
            onAgentConfig={saveAgentConfig}
            onAgentInbox={saveAgentInbox}
            onCalendarEvents={saveCalendarEventsToApi}
            onDayOSSettings={saveDayOSSettings}
            onJournal={saveJournal}
            onMemos={saveMemos}
            onPhotos={savePhotos}
          />
        )}
      </section>
    </main>
  )
}

function LoginScreen({ lang, onLanguage, onSignIn }: { lang: Lang; onLanguage: (lang: Lang) => void; onSignIn: () => void }) {
  const t = text[lang]
  const [scene, setScene] = useState<LoginScene>(() => getInitialLoginScene())
  const [email, setEmail] = useState(testLogin.email)
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => {
      setScene(getInitialLoginScene())
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [])

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()

    if (!codeSent) {
      if (normalizedEmail !== testLogin.email) {
        setMessage(lang === 'zh' ? '当前本地版本只保留测试账户。' : 'This local build only keeps the test account.')
        return
      }

      setCodeSent(true)
      setMessage(lang === 'zh' ? `验证码已发送：${testLogin.code}` : `Verification code sent: ${testLogin.code}`)
      return
    }

    if (normalizedEmail === testLogin.email && code.trim() === testLogin.code) {
      onSignIn()
      return
    }

    setMessage(lang === 'zh' ? '邮箱或验证码不正确。' : 'Email or verification code is incorrect.')
  }

  return (
    <main className="login-screen">
      <section className={`login-visual ${scene}`} aria-label="DayOS preview">
        <div className="scene-layer" aria-hidden="true">
          <span className="scene-sun" />
          <span className="scene-moon" />
          <span className="scene-star star-one" />
          <span className="scene-star star-two" />
          <span className="scene-star star-three" />
          <span className="scene-cloud cloud-one" />
          <span className="scene-cloud cloud-two" />
          <span className="scene-horizon" />
        </div>
        <div className="preview-topline">
          <span className="brand-mark">D</span>
          <span>DayOS</span>
        </div>
        <div className="floating-panel panel-one">
          <p>{{ morning: '07:20', noon: '12:30', evening: '17:40', night: '21:10' }[scene]}</p>
          <strong>
            {lang === 'zh'
              ? { morning: '日出计划', noon: '午间整理', evening: '落日前整理', night: '夜晚复盘' }[scene]
              : { morning: 'Sunrise plan', noon: 'Midday reset', evening: 'Sunset reset', night: 'Night review' }[scene]}
          </strong>
          <span>{lang === 'zh' ? '今日安排正在同步' : 'Today plan is syncing'}</span>
        </div>
        <div className="floating-panel panel-two">
          <p>AI Agent</p>
          <strong>Hermes / OpenClaw</strong>
          <span>{lang === 'zh' ? '自动分类与推送' : 'Auto-classified push'}</span>
        </div>
        <div className="floating-panel panel-three">
          <p>{t.journal}</p>
          <strong>{lang === 'zh' ? '午餐照片已保存' : 'Lunch photo saved'}</strong>
          <span>{lang === 'zh' ? '准备生成每日复盘' : 'Ready for daily recap'}</span>
        </div>
      </section>

      <section className="login-panel">
        <div>
          <div className="login-heading-row">
            <p className="eyebrow">{t.privateBeta}</p>
            <button className="lang-button" type="button" onClick={() => onLanguage(lang === 'zh' ? 'en' : 'zh')}>
              {lang === 'zh' ? '中文' : 'EN'}
            </button>
          </div>
          <h1>{t.signIn}</h1>
          <p className="login-subtitle">{t.loginSubtitle}</p>
        </div>

        <form className="login-form" onSubmit={submitLogin}>
          <label>
            {t.email}
            <input value={email} type="email" onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            {lang === 'zh' ? '邮箱验证码' : 'Email verification code'}
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder={codeSent ? testLogin.code : lang === 'zh' ? '先发送验证码' : 'Send code first'}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <button className="primary-button" type="submit">
            <Icon name="lock" />
            <span>{codeSent ? t.enter : lang === 'zh' ? '发送验证码' : 'Send code'}</span>
          </button>
          <div className="test-account-box">
            <strong>{lang === 'zh' ? '测试账户' : 'Test account'}</strong>
            <span>{testLogin.email}</span>
            <span>{lang === 'zh' ? `验证码：${testLogin.code}` : `Code: ${testLogin.code}`}</span>
          </div>
          {message && <p className="login-message">{message}</p>}
        </form>
      </section>
    </main>
  )
}

function NavItem({ active, icon, label, onClick }: { active: boolean; icon: IconName; label: string; onClick: () => void }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} type="button" title={label} onClick={onClick}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  )
}

function TodayPage(props: {
  aiDraft: string
  agentSource: 'Hermes' | 'OpenClaw'
  agentInbox: AgentInboxItem[]
  calendarEvents: CalendarEvent[]
  editMode: boolean
  journal: string
  lang: Lang
  memos: MemoItem[]
  mode: ViewMode
  photos: PhotoItem[]
  prompt: string
  t: Record<string, string>
  visibleWidgets: Widget[]
  widgets: Widget[]
  onAgentSource: (source: 'Hermes' | 'OpenClaw') => void
  onCycleWidgetSize: (id: WidgetId) => void
  onNavigate: (page: Page) => void
  onMode: (mode: ViewMode) => void
  onPrompt: (value: string) => void
  onSubmit: () => void
  onToggleWidget: (id: WidgetId) => void
}) {
  const { aiDraft, agentInbox, agentSource, calendarEvents, editMode, journal, lang, memos, mode, photos, prompt, t, visibleWidgets, widgets } = props
  const todayEvents = calendarEvents
    .filter((event) => event.date === dayosToday)
    .sort((a, b) => a.time.localeCompare(b.time))
  const dayProgress = todayEvents.length
    ? Math.round(todayEvents.reduce((sum, event) => sum + event.progress, 0) / todayEvents.length)
    : 0
  const openEvents = todayEvents.filter((event) => event.progress < 100).length
  return (
    <>
      <section className="status-band" aria-label="Today status">
        <div className="status-copy">
          <p className="eyebrow">{t.livePlan}</p>
          <h2>
            {lang === 'zh'
              ? `${todayEvents.length} 个日程，${memos.length} 条备忘录，${agentInbox.length} 条 Agent 消息`
              : `${todayEvents.length} events, ${memos.length} memos, ${agentInbox.length} Agent messages`}
          </h2>
          <p>{t.statusCopy}</p>
        </div>
        <div className="day-meter" aria-label="Day progress">
          <div className="meter-ring"><span>{dayProgress}%</span></div>
          <p>{t.dayProgress}</p>
        </div>
      </section>

      <section className="command-bar" aria-label="AI command input">
        <Icon name="spark" />
        <input value={prompt} onChange={(event) => props.onPrompt(event.target.value)} placeholder={t.commandPlaceholder} />
        <select value={agentSource} onChange={(event) => props.onAgentSource(event.target.value as 'Hermes' | 'OpenClaw')} aria-label="Agent source">
          <option>Hermes</option>
          <option>OpenClaw</option>
        </select>
        <button type="button" title="Send to AI planner" onClick={props.onSubmit}><Icon name="send" /></button>
      </section>
      <p className="ai-draft">{aiDraft}</p>

      <section className="mode-row" aria-label="Dashboard modes">
        {(['work', 'life', 'review'] as ViewMode[]).map((item) => (
          <button key={item} className={mode === item ? 'active' : ''} type="button" onClick={() => props.onMode(item)}>
            {t[item]}
          </button>
        ))}
      </section>

      <Legend lang={lang} />

      {editMode && (
        <section className="customize-panel" aria-label="Customize dashboard">
          <div>
            <p className="eyebrow">{t.customize}</p>
            <h2>{t.customizeTitle}</h2>
          </div>
          <div className="module-toggles">
            {widgets.map((widget) => (
              <div className="module-toggle" key={widget.id}>
                <button className={widget.enabled ? 'toggle active' : 'toggle'} type="button" onClick={() => props.onToggleWidget(widget.id)} aria-label={`Toggle ${widgetLabels[lang][widget.id][0]}`} />
                <span>{widgetLabels[lang][widget.id][0]}</span>
                <button className="size-button" type="button" onClick={() => props.onCycleWidgetSize(widget.id)}>{widget.size}</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-grid" aria-label="Dashboard widgets">
        {visibleWidgets.map((widget) => (
          <DashboardWidget
            agentInbox={agentInbox}
            events={todayEvents}
            journal={journal}
            key={widget.id}
            lang={lang}
            memos={memos}
            openEvents={openEvents}
            photos={photos}
            widget={widget}
            onNavigate={props.onNavigate}
          />
        ))}
      </section>
    </>
  )
}

function Legend({ lang }: { lang: Lang }) {
  const t = text[lang]
  return (
    <section className="legend-row" aria-label={t.progressLegend}>
      <strong>{t.progressLegend}</strong>
      <span className="category-pill work">{t.redWork}</span>
      <span className="category-pill life">{t.blueLife}</span>
      <span className="category-pill health">{t.healthGreen}</span>
      <span className="category-pill agent">{t.agentPurple}</span>
    </section>
  )
}

function DashboardWidget({
  agentInbox,
  events,
  journal,
  lang,
  memos,
  openEvents,
  photos,
  widget,
  onNavigate,
}: {
  agentInbox: AgentInboxItem[]
  events: CalendarEvent[]
  journal: string
  lang: Lang
  memos: MemoItem[]
  openEvents: number
  photos: PhotoItem[]
  widget: Widget
  onNavigate: (page: Page) => void
}) {
  const [title, eyebrow] = widgetLabels[lang][widget.id]
  return (
    <article className={`widget ${widget.size}`}>
      <header className="widget-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <WidgetIcon id={widget.id} />
      </header>
      <WidgetBody
        agentInbox={agentInbox}
        events={events}
        id={widget.id}
        journal={journal}
        lang={lang}
        memos={memos}
        openEvents={openEvents}
        photos={photos}
        onNavigate={onNavigate}
      />
    </article>
  )
}

function WidgetIcon({ id }: { id: WidgetId }) {
  const icon: Record<string, IconName> = {
    health: 'heart',
    agent: 'message',
    journal: 'edit',
    memo: 'note',
    photos: 'image',
    summary: 'spark',
    tasks: 'check',
    timeline: 'calendar',
  }
  return <span className="widget-icon"><Icon name={icon[id] ?? 'spark'} /></span>
}

function WidgetBody({
  agentInbox,
  events,
  id,
  journal,
  lang,
  memos,
  openEvents,
  photos,
  onNavigate,
}: {
  agentInbox: AgentInboxItem[]
  events: CalendarEvent[]
  id: WidgetId
  journal: string
  lang: Lang
  memos: MemoItem[]
  openEvents: number
  photos: PhotoItem[]
  onNavigate: (page: Page) => void
}) {
  if (id === 'timeline') return <CalendarTimeline events={events} lang={lang} onNavigate={onNavigate} />
  if (id === 'tasks') return <TodayProgress events={events} lang={lang} openEvents={openEvents} onNavigate={onNavigate} />
  if (id === 'agent') return <AgentInboxPreview inbox={agentInbox} lang={lang} onNavigate={onNavigate} />
  if (id === 'memo') {
    return (
      <div className="memo-surface">
        {memos.slice(0, 2).map((memo) => (
          <div className="preview-row" key={memo.id}>
            <strong>{memo.title}</strong>
            <span>{memo.body || (lang === 'zh' ? '空备忘录' : 'Empty memo')}</span>
          </div>
        ))}
        {memos.length === 0 && <p>{lang === 'zh' ? '还没有备忘录。' : 'No memos yet.'}</p>}
        <button type="button" onClick={() => onNavigate('memo')}>{lang === 'zh' ? '打开备忘录' : 'Open memos'}</button>
      </div>
    )
  }
  if (id === 'journal') {
    return (
      <div className="journal-surface">
        <textarea readOnly value={journal} />
        <button className="inline-link-button" type="button" onClick={() => onNavigate('journal')}>{lang === 'zh' ? '编辑日记' : 'Edit journal'}</button>
      </div>
    )
  }
  if (id === 'photos') return <PhotoPreview lang={lang} photos={photos} onNavigate={onNavigate} />
  if (id === 'health') {
    return (
      <div className="metric-stack">
        <div><strong>7,420</strong><span>{lang === 'zh' ? '步数，来自未来 iOS App' : 'steps from future iOS app'}</span></div>
        <div><strong>6h 45m</strong><span>{lang === 'zh' ? '睡眠占位数据' : 'sleep placeholder'}</span></div>
      </div>
    )
  }
  return (
    <div className="summary-copy">
      <p>
        {lang === 'zh'
          ? `今天有 ${events.length} 个日程、${memos.length} 条备忘录、${photos.length} 张照片、${agentInbox.length} 条 Agent 消息。`
          : `Today has ${events.length} events, ${memos.length} memos, ${photos.length} photos, and ${agentInbox.length} Agent messages.`}
      </p>
      <div className="summary-bars"><span style={{ width: '72%' }} /><span style={{ width: '48%' }} /><span style={{ width: '86%' }} /></div>
    </div>
  )
}

function CalendarTimeline({ events, lang, onNavigate }: { events: CalendarEvent[]; lang: Lang; onNavigate: (page: Page) => void }) {
  return (
    <div className="timeline-list">
      {events.length === 0 ? (
        <div className="empty-state compact">{lang === 'zh' ? '今天还没有日程。' : 'No events today.'}</div>
      ) : events.slice(0, 5).map((event) => (
        <div className={`timeline-item ${event.category}`} key={event.id}>
          <time>{event.time}</time>
          <div>
            <strong>{event.title}</strong>
            <span>{event.date}</span>
            <ProgressBar category={event.category} value={event.progress} />
          </div>
        </div>
      ))}
      <button className="inline-link-button" type="button" onClick={() => onNavigate('calendar')}>{lang === 'zh' ? '打开日历' : 'Open calendar'}</button>
    </div>
  )
}

function TodayProgress({ events, lang, openEvents, onNavigate }: { events: CalendarEvent[]; lang: Lang; openEvents: number; onNavigate: (page: Page) => void }) {
  return (
    <div className="task-list">
      {events.length === 0 ? (
        <div className="empty-state compact">{lang === 'zh' ? '没有待推进事项。' : 'No active items.'}</div>
      ) : events.slice(0, 4).map((event) => (
        <label className={`task-row ${event.category}`} key={event.id}>
          <input checked={event.progress >= 100} readOnly type="checkbox" />
          <span>{event.title}</span>
          <ProgressBar category={event.category} value={event.progress} />
        </label>
      ))}
      <div className="preview-row">
        <strong>{lang === 'zh' ? '未完成' : 'Open'}</strong>
        <span>{openEvents} {lang === 'zh' ? '个时间块仍在进行' : 'time blocks still active'}</span>
      </div>
      <button className="inline-link-button" type="button" onClick={() => onNavigate('calendar')}>{lang === 'zh' ? '管理进度' : 'Manage progress'}</button>
    </div>
  )
}

function AgentInboxPreview({ inbox, lang, onNavigate }: { inbox: AgentInboxItem[]; lang: Lang; onNavigate: (page: Page) => void }) {
  return (
    <div className="message-list">
      {inbox.length === 0 ? (
        <div className="empty-state compact">{lang === 'zh' ? '还没有 Agent 消息。' : 'No Agent messages yet.'}</div>
      ) : inbox.slice(0, 4).map((message) => (
        <div className={`message-row ${message.category}`} key={message.id}>
          <strong>{message.title}</strong>
          <span>{message.source} · {message.createdAt}</span>
        </div>
      ))}
      <button className="inline-link-button" type="button" onClick={() => onNavigate('agent')}>{lang === 'zh' ? '打开 AI Agent' : 'Open AI Agent'}</button>
    </div>
  )
}

function PhotoPreview({ lang, photos, onNavigate }: { lang: Lang; photos: PhotoItem[]; onNavigate: (page: Page) => void }) {
  return (
    <div className="photo-preview-stack">
      {photos.length === 0 ? (
        <PhotoGrid lang={lang} />
      ) : (
        <div className="photo-grid">
          {photos.slice(0, 2).map((photo) => (
            <div className="photo-thumb" key={photo.id}>
              <img alt={photo.label} src={photo.src} />
              <span>{photo.label}</span>
            </div>
          ))}
          <button className="upload-tile" type="button" onClick={() => onNavigate('photos')}>
            <Icon name="plus" />
          </button>
        </div>
      )}
      <button className="inline-link-button" type="button" onClick={() => onNavigate('photos')}>{lang === 'zh' ? '打开照片' : 'Open photos'}</button>
    </div>
  )
}

function ProgressBar({ category, value }: { category: Category; value: number }) {
  return (
    <div className={`progress-track ${category}`} aria-label={`${value}%`}>
      <span style={{ width: `${value}%` }} />
    </div>
  )
}

function ModulePage({
  agentConfig,
  agentInbox,
  calendarEvents,
  dayOSSettings,
  journal,
  lang,
  memos,
  page,
  photos,
  onAgentSource,
  onAgentConfig,
  onAgentInbox,
  onCalendarEvents,
  onDayOSSettings,
  onJournal,
  onMemos,
  onPhotos,
}: {
  agentConfig: AgentConfig
  agentInbox: AgentInboxItem[]
  calendarEvents: CalendarEvent[]
  dayOSSettings: DayOSSettings
  journal: string
  lang: Lang
  memos: MemoItem[]
  page: Page
  photos: PhotoItem[]
  onAgentSource: (source: 'Hermes' | 'OpenClaw') => void
  onAgentConfig: (config: AgentConfig) => void
  onAgentInbox: (items: AgentInboxItem[]) => void
  onCalendarEvents: (events: CalendarEvent[]) => void
  onDayOSSettings: (settings: DayOSSettings) => void
  onJournal: (journal: string) => void
  onMemos: (memos: MemoItem[]) => void
  onPhotos: (photos: PhotoItem[]) => void
}) {
  if (page === 'calendar') {
    return (
      <section className="module-page">
        <div className="module-layout">
          <article className="module-card wide-card">
            <header><p className="eyebrow">{text[lang].calendar}</p><h2>{lang === 'zh' ? '今日时间块' : 'Today blocks'}</h2></header>
            <EditableCalendar events={calendarEvents} lang={lang} settings={dayOSSettings} onSave={onCalendarEvents} />
          </article>
          <article className="module-card"><header><p className="eyebrow">Apple</p><h2>{lang === 'zh' ? '同步计划' : 'Sync plan'}</h2></header><p>{text[lang].appleBridge}</p></article>
        </div>
      </section>
    )
  }
  if (page === 'memo') {
    return <ModuleShell eyebrow={text[lang].memo} title={lang === 'zh' ? '备忘录工作台' : 'Memo workspace'}><EditableMemos lang={lang} memos={memos} onSave={onMemos} /></ModuleShell>
  }
  if (page === 'journal') {
    return <ModuleShell eyebrow={text[lang].journal} title={lang === 'zh' ? '每日工作与生活记录' : 'Daily work and life log'}><EditableJournal journal={journal} lang={lang} onSave={onJournal} /></ModuleShell>
  }
  if (page === 'photos') {
    return <ModuleShell eyebrow={text[lang].photos} title={lang === 'zh' ? '照片与饮食记录' : 'Photos and meal log'}><EditablePhotos lang={lang} photos={photos} onSave={onPhotos} /></ModuleShell>
  }
  if (page === 'agent') {
    return (
      <ModuleShell eyebrow={text[lang].agent} title={lang === 'zh' ? 'AI Agent 消息中心' : 'AI Agent inbox'}>
        <AgentConsole
          config={agentConfig}
          inbox={agentInbox}
          lang={lang}
          onAgentSource={onAgentSource}
          onConfig={onAgentConfig}
          onInbox={onAgentInbox}
        />
      </ModuleShell>
    )
  }
  return (
    <ModuleShell eyebrow={text[lang].settings} title={lang === 'zh' ? '连接与偏好设置' : 'Connections and preferences'}>
      <EditableSettings
        agentConfig={agentConfig}
        lang={lang}
        settings={dayOSSettings}
        onAgentConfig={onAgentConfig}
        onSettings={onDayOSSettings}
      />
    </ModuleShell>
  )
}

function getMonthDays(selectedDate: string) {
  const [year, month] = selectedDate.split('-').map(Number)
  const first = new Date(year, month - 1, 1)
  const startOffset = (first.getDay() + 6) % 7
  const start = new Date(year, month - 1, 1 - startOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(start)
    current.setDate(start.getDate() + index)
    const date = [
      current.getFullYear(),
      String(current.getMonth() + 1).padStart(2, '0'),
      String(current.getDate()).padStart(2, '0'),
    ].join('-')

    return {
      date,
      inMonth: current.getMonth() === month - 1,
      label: String(current.getDate()),
    }
  })
}

function EditableCalendar({
  events,
  lang,
  settings,
  onSave,
}: {
  events: CalendarEvent[]
  lang: Lang
  settings: DayOSSettings
  onSave: (events: CalendarEvent[]) => void
}) {
  const [drafts, setDrafts] = useState(events)
  const [selectedDate, setSelectedDate] = useState(events[0]?.date || '2026-07-09')
  const [syncStatus, setSyncStatus] = useState('')

  const visibleEvents = drafts.filter((event) => event.date === selectedDate)
  const monthDays = getMonthDays(selectedDate)
  const selectedMonth = selectedDate.slice(0, 7)

  function addEvent() {
    setDrafts((current) => [
      ...current,
      {
        id: `event-${Date.now()}`,
        date: selectedDate,
        time: '18:00',
        title: lang === 'zh' ? '新的安排' : 'New event',
        category: 'work',
        progress: 0,
      },
    ])
  }

  function saveCalendarForm(form: HTMLFormElement) {
    const formData = new FormData(form)
    const nextEvents = drafts.map((draft) => ({
      id: draft.id,
      date: draft.date,
      time: String(formData.get(`${draft.id}.time`) ?? draft.time),
      title: String(formData.get(`${draft.id}.title`) ?? draft.title),
      category: String(formData.get(`${draft.id}.category`) as Category | null ?? draft.category) as Category,
      progress: Number(formData.get(`${draft.id}.progress`) ?? draft.progress),
    }))
    setDrafts(nextEvents)
    onSave(nextEvents)
  }

  function saveCalendar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    saveCalendarForm(event.currentTarget)
  }

  async function syncReminders(form: HTMLFormElement) {
    saveCalendarForm(form)
    setSyncStatus(lang === 'zh' ? '正在同步到 Apple Reminders...' : 'Syncing to Apple Reminders...')
    try {
      const response = await apiJson<{ syncedCount: number; message: string; mode: string }>('/api/calendar/sync-reminders', {
        body: JSON.stringify({
          credentials: settings,
          events: drafts.filter((event) => event.date === selectedDate),
        }),
        headers: {
          Authorization: `Bearer ${dayosApiToken}`,
        },
        method: 'POST',
      })
      setSyncStatus(
        lang === 'zh'
          ? `同步接口已连接：${response.syncedCount} 条日程，当前模式 ${response.mode}。`
          : `Sync endpoint connected: ${response.syncedCount} events, mode ${response.mode}.`,
      )
    } catch (error) {
      setSyncStatus(lang === 'zh' ? '同步失败：请先在设置里填写 iCloud 密钥。' : 'Sync failed: add iCloud credentials in Settings first.')
      console.warn(error)
    }
  }

  return (
    <form className="editor-stack" onSubmit={saveCalendar}>
      <section className="calendar-picker">
        <div className="calendar-picker-header">
          <strong>{selectedMonth}</strong>
          <input aria-label="Selected date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </div>
        <div className="calendar-weekdays">
          {(lang === 'zh' ? ['一', '二', '三', '四', '五', '六', '日'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="calendar-month-grid">
          {monthDays.map((day) => {
            const count = drafts.filter((event) => event.date === day.date).length
            return (
              <button
                className={`${day.inMonth ? '' : 'muted'} ${day.date === selectedDate ? 'active' : ''}`}
                key={day.date}
                type="button"
                onClick={() => setSelectedDate(day.date)}
              >
                <span>{day.label}</span>
                {count > 0 && <em>{count}</em>}
              </button>
            )
          })}
        </div>
      </section>

      <section className="time-block-section">
        <div className="time-block-heading">
          <div>
            <p className="eyebrow">{selectedDate}</p>
            <h3>{lang === 'zh' ? '当天时间块' : 'Day time blocks'}</h3>
          </div>
          <span>{visibleEvents.length} {lang === 'zh' ? '条日程' : 'events'}</span>
        </div>
        {visibleEvents.length === 0 ? (
          <div className="empty-state">{lang === 'zh' ? '这一天还没有日程。点击新增日程开始安排。' : 'No events for this day. Add one to start planning.'}</div>
        ) : (
          visibleEvents.map((event) => (
            <div className={`edit-row ${event.category}`} key={event.id}>
              <input aria-label="Time" defaultValue={event.time} name={`${event.id}.time`} />
              <input aria-label="Title" defaultValue={event.title} name={`${event.id}.title`} />
              <select aria-label="Category" defaultValue={event.category} name={`${event.id}.category`}>
                <option value="work">{lang === 'zh' ? '工作' : 'Work'}</option>
                <option value="life">{lang === 'zh' ? '生活' : 'Life'}</option>
                <option value="health">{lang === 'zh' ? '健康' : 'Health'}</option>
                <option value="agent">Agent</option>
              </select>
              <input aria-label="Progress" defaultValue={event.progress} max="100" min="0" name={`${event.id}.progress`} type="number" />
              <ProgressBar category={event.category} value={event.progress} />
            </div>
          ))
        )}
      </section>
      <div className="editor-actions">
        <button type="button" onClick={addEvent}>{lang === 'zh' ? '新增日程' : 'Add event'}</button>
        <button type="button" onClick={(event) => syncReminders(event.currentTarget.form!)}>{lang === 'zh' ? '同步到 Apple Reminders' : 'Sync to Apple Reminders'}</button>
        <button className="primary-action" type="button" onClick={(event) => saveCalendarForm(event.currentTarget.form!)}>{lang === 'zh' ? '保存日历' : 'Save calendar'}</button>
      </div>
      {syncStatus && <p className="api-status">{syncStatus}</p>}
    </form>
  )
}

function EditableMemos({ lang, memos, onSave }: { lang: Lang; memos: MemoItem[]; onSave: (memos: MemoItem[]) => void }) {
  const [drafts, setDrafts] = useState(memos)

  function addMemo() {
    setDrafts((current) => [
      ...current,
      { id: `memo-${Date.now()}`, title: lang === 'zh' ? '新的备忘录' : 'New memo', body: '' },
    ])
  }

  function saveMemoForm(form: HTMLFormElement) {
    const formData = new FormData(form)
    const nextMemos = drafts.map((draft) => ({
      id: draft.id,
      title: String(formData.get(`${draft.id}.title`) ?? draft.title),
      body: String(formData.get(`${draft.id}.body`) ?? draft.body),
    }))
    setDrafts(nextMemos)
    onSave(nextMemos)
  }

  function saveMemos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    saveMemoForm(event.currentTarget)
  }

  return (
    <form className="editor-stack" onSubmit={saveMemos}>
      <div className="note-board editable">
        {drafts.map((memo) => (
          <article className="note-card editable" key={memo.id}>
            <input aria-label="Memo title" defaultValue={memo.title} name={`${memo.id}.title`} />
            <textarea aria-label="Memo body" defaultValue={memo.body} name={`${memo.id}.body`} />
          </article>
        ))}
      </div>
      <div className="editor-actions">
        <button type="button" onClick={addMemo}>{lang === 'zh' ? '新增备忘录' : 'Add memo'}</button>
        <button className="primary-action" type="button" onClick={(event) => saveMemoForm(event.currentTarget.form!)}>{lang === 'zh' ? '保存备忘录' : 'Save memos'}</button>
      </div>
    </form>
  )
}

function EditableJournal({ journal, lang, onSave }: { journal: string; lang: Lang; onSave: (journal: string) => void }) {
  return (
    <form
      className="editor-stack"
      onSubmit={(event) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        onSave(String(formData.get('journal') ?? journal))
      }}
    >
      <div className="journal-surface page-journal">
        <textarea defaultValue={journal} name="journal" />
      </div>
      <div className="editor-actions">
        <button className="primary-action" type="button" onClick={(event) => {
          const formData = new FormData(event.currentTarget.form!)
          onSave(String(formData.get('journal') ?? journal))
        }}>{lang === 'zh' ? '保存日记' : 'Save journal'}</button>
      </div>
    </form>
  )
}

function EditablePhotos({ lang, photos, onSave }: { lang: Lang; photos: PhotoItem[]; onSave: (photos: PhotoItem[]) => void }) {
  const [drafts, setDrafts] = useState(photos)

  function savePhotoMeta(form: HTMLFormElement) {
    const formData = new FormData(form)
    const nextPhotos = drafts.map((photo) => ({
      ...photo,
      label: String(formData.get(`${photo.id}.label`) ?? photo.label),
      note: String(formData.get(`${photo.id}.note`) ?? photo.note),
    }))
    setDrafts(nextPhotos)
    onSave(nextPhotos)
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return
    const uploaded = await Promise.all(
      Array.from(files).map(async (file) => ({
        id: `photo-${Date.now()}-${file.name}`,
        label: lang === 'zh' ? '新的照片' : 'New photo',
        note: file.name,
        src: await fileToCompressedDataUrl(file),
        createdAt: new Date().toLocaleString(),
      })),
    )
    const nextPhotos = [...uploaded, ...drafts]
    setDrafts(nextPhotos)
    onSave(nextPhotos)
  }

  return (
    <form className="editor-stack" onSubmit={(event) => { event.preventDefault(); savePhotoMeta(event.currentTarget) }}>
      <label className="photo-upload-control">
        <Icon name="plus" />
        <span>{lang === 'zh' ? '上传照片并保存到本地' : 'Upload photos and save locally'}</span>
        <input accept="image/*" multiple type="file" onChange={(event) => addPhotos(event.target.files)} />
      </label>
      <div className="saved-photo-grid">
        {drafts.length === 0 ? (
          <div className="empty-state">{lang === 'zh' ? '还没有照片。可以先上传午餐、工作台或一天中的记录。' : 'No photos yet. Upload lunch, desk, or daily moments.'}</div>
        ) : (
          drafts.map((photo) => (
            <article className="saved-photo-card" key={photo.id}>
              <img alt={photo.label} src={photo.src} />
              <input aria-label="Photo label" defaultValue={photo.label} name={`${photo.id}.label`} />
              <textarea aria-label="Photo note" defaultValue={photo.note} name={`${photo.id}.note`} />
              <span>{photo.createdAt}</span>
            </article>
          ))
        )}
      </div>
      <div className="editor-actions">
        <button className="primary-action" type="button" onClick={(event) => savePhotoMeta(event.currentTarget.form!)}>{lang === 'zh' ? '保存照片记录' : 'Save photo log'}</button>
      </div>
    </form>
  )
}

function fileToCompressedDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    let settled = false
    function finish(value: string) {
      if (settled) return
      settled = true
      resolve(value)
    }

    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const rawDataUrl = String(reader.result)
      window.setTimeout(() => finish(rawDataUrl), 1000)
      const image = new Image()
      image.onerror = () => finish(rawDataUrl)
      image.onload = () => {
        const maxEdge = 960
        const ratio = Math.min(1, maxEdge / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * ratio))
        canvas.height = Math.max(1, Math.round(image.height * ratio))
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('Canvas is unavailable'))
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        finish(canvas.toDataURL('image/jpeg', 0.78))
      }
      image.src = rawDataUrl
    }
    reader.readAsDataURL(file)
  })
}

function AgentConsole({
  config,
  inbox,
  lang,
  onAgentSource,
  onConfig,
  onInbox,
}: {
  config: AgentConfig
  inbox: AgentInboxItem[]
  lang: Lang
  onAgentSource: (source: 'Hermes' | 'OpenClaw') => void
  onConfig: (config: AgentConfig) => void
  onInbox: (items: AgentInboxItem[]) => void
}) {
  const [draftConfig, setDraftConfig] = useState(config)
  const [status, setStatus] = useState('')

  async function saveConfig() {
    try {
      const result = await apiJson<{ config: AgentConfig }>('/api/agent/config', {
        body: JSON.stringify(draftConfig),
        method: 'PUT',
      })
      onConfig(result.config)
      onAgentSource(result.config.source)
      setStatus(lang === 'zh' ? 'Agent 接入配置已保存到 API。' : 'Agent integration saved to API.')
    } catch (error) {
      onConfig(draftConfig)
      onAgentSource(draftConfig.source)
      setStatus(lang === 'zh' ? 'API 不可用，已暂存到浏览器本地。' : 'API unavailable, saved locally in browser.')
      console.warn(error)
    }
  }

  async function simulatePush() {
    const payload: Omit<AgentInboxItem, 'id'> = {
      source: draftConfig.source,
      title: draftConfig.source === 'Hermes' ? 'Hermes: New schedule payload' : 'OpenClaw: New task payload',
      body: lang === 'zh'
        ? `模拟从 ${draftConfig.source} 收到一条消息。真实版本会通过 ${draftConfig.webhookUrl} 接收。`
        : `Simulated message from ${draftConfig.source}. The real version will receive it through ${draftConfig.webhookUrl}.`,
      category: draftConfig.autoClassify ? 'agent' : 'work',
      createdAt: new Date().toISOString(),
    }

    try {
      const result = await apiJson<{ message: AgentInboxItem }>('/api/agent/push', {
        body: JSON.stringify(payload),
        headers: {
          Authorization: `Bearer ${dayosApiToken}`,
        },
        method: 'POST',
      })
      onInbox([result.message, ...inbox])
      setStatus(lang === 'zh' ? '已通过 /api/agent/push 接收消息。' : 'Message received through /api/agent/push.')
    } catch (error) {
      const fallback: AgentInboxItem = {
        id: `agent-message-${Date.now()}`,
        ...payload,
      }
      onInbox([fallback, ...inbox])
      setStatus(lang === 'zh' ? 'API 不可用，消息已暂存到浏览器本地。' : 'API unavailable, message saved locally.')
      console.warn(error)
    }
  }

  return (
    <div className="agent-console">
      <section className="agent-config-panel">
        <div className="agent-source-row">
          <span>{text[lang].source}</span>
          <button className={draftConfig.source === 'Hermes' ? 'active' : ''} type="button" onClick={() => setDraftConfig({ ...draftConfig, source: 'Hermes' })}>Hermes</button>
          <button className={draftConfig.source === 'OpenClaw' ? 'active' : ''} type="button" onClick={() => setDraftConfig({ ...draftConfig, source: 'OpenClaw' })}>OpenClaw</button>
        </div>
        <div className="settings-form-grid">
          <label>
            Webhook URL
            <input value={draftConfig.webhookUrl} onChange={(event) => setDraftConfig({ ...draftConfig, webhookUrl: event.target.value })} />
          </label>
          <label>
            AI API Endpoint
            <input value={draftConfig.apiEndpoint} onChange={(event) => setDraftConfig({ ...draftConfig, apiEndpoint: event.target.value })} />
          </label>
          <label>
            Model
            <input value={draftConfig.model} onChange={(event) => setDraftConfig({ ...draftConfig, model: event.target.value })} />
          </label>
          <label>
            API Key
            <input placeholder="sk-..." type="password" value={draftConfig.apiKey} onChange={(event) => setDraftConfig({ ...draftConfig, apiKey: event.target.value })} />
          </label>
        </div>
        <label className="switch-row">
          <input checked={draftConfig.autoClassify} type="checkbox" onChange={(event) => setDraftConfig({ ...draftConfig, autoClassify: event.target.checked })} />
          <span>{lang === 'zh' ? '自动分类 Agent 消息' : 'Auto-classify Agent messages'}</span>
        </label>
        <div className="editor-actions">
          <button type="button" onClick={simulatePush}>{lang === 'zh' ? '模拟接收推送' : 'Simulate push'}</button>
          <button className="primary-action" type="button" onClick={saveConfig}>{lang === 'zh' ? '保存 Agent 接入' : 'Save Agent integration'}</button>
        </div>
        {status && <p className="api-status">{status}</p>}
      </section>

      <section className="agent-inbox-panel">
        {inbox.map((message) => (
          <article className={`agent-message-card ${message.category}`} key={message.id}>
            <div>
              <strong>{message.title}</strong>
              <span>{message.source} · {message.createdAt}</span>
            </div>
            <p>{message.body}</p>
          </article>
        ))}
      </section>
    </div>
  )
}

function EditableSettings({
  agentConfig,
  lang,
  settings,
  onAgentConfig,
  onSettings,
}: {
  agentConfig: AgentConfig
  lang: Lang
  settings: DayOSSettings
  onAgentConfig: (config: AgentConfig) => void
  onSettings: (settings: DayOSSettings) => void
}) {
  const [draftSettings, setDraftSettings] = useState(settings)
  const [draftAgent, setDraftAgent] = useState(agentConfig)
  const [status, setStatus] = useState('')

  async function saveSettings() {
    try {
      const [settingsResult, agentResult] = await Promise.all([
        apiJson<{ settings: DayOSSettings }>('/api/settings', {
          body: JSON.stringify(draftSettings),
          method: 'PUT',
        }),
        apiJson<{ config: AgentConfig }>('/api/agent/config', {
          body: JSON.stringify(draftAgent),
          method: 'PUT',
        }),
      ])
      onSettings(settingsResult.settings)
      onAgentConfig(agentResult.config)
      setStatus(lang === 'zh' ? '设置已保存到 API。' : 'Settings saved to API.')
    } catch (error) {
      onSettings(draftSettings)
      onAgentConfig(draftAgent)
      setStatus(lang === 'zh' ? 'API 不可用，设置已暂存到浏览器本地。' : 'API unavailable, settings saved locally.')
      console.warn(error)
    }
  }

  return (
    <div className="settings-editor">
      <section className="settings-form-grid">
        <label>
          {lang === 'zh' ? '默认语言' : 'Default language'}
          <select value={draftSettings.defaultLanguage} onChange={(event) => setDraftSettings({ ...draftSettings, defaultLanguage: event.target.value as Lang })}>
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </label>
        <label>
          {lang === 'zh' ? '照片存储' : 'Photo storage'}
          <select value={draftSettings.photoStorage} onChange={(event) => setDraftSettings({ ...draftSettings, photoStorage: event.target.value as 'local' | 'cloud' })}>
            <option value="local">{lang === 'zh' ? '浏览器本地' : 'Browser local'}</option>
            <option value="cloud">{lang === 'zh' ? '云存储预留' : 'Cloud storage reserved'}</option>
          </select>
        </label>
        <label>
          AI API Endpoint
          <input value={draftAgent.apiEndpoint} onChange={(event) => setDraftAgent({ ...draftAgent, apiEndpoint: event.target.value })} />
        </label>
        <label>
          AI Model
          <input value={draftAgent.model} onChange={(event) => setDraftAgent({ ...draftAgent, model: event.target.value })} />
        </label>
        <label>
          Agent Webhook
          <input value={draftAgent.webhookUrl} onChange={(event) => setDraftAgent({ ...draftAgent, webhookUrl: event.target.value })} />
        </label>
        <label>
          API Key
          <input placeholder="sk-..." type="password" value={draftAgent.apiKey} onChange={(event) => setDraftAgent({ ...draftAgent, apiKey: event.target.value })} />
        </label>
        <label>
          iCloud Apple ID
          <input placeholder="name@example.com" value={draftSettings.icloudAppleId} onChange={(event) => setDraftSettings({ ...draftSettings, icloudAppleId: event.target.value })} />
        </label>
        <label>
          {lang === 'zh' ? 'iCloud 应用专用密码' : 'iCloud app-specific password'}
          <input placeholder="xxxx-xxxx-xxxx-xxxx" type="password" value={draftSettings.icloudAppPassword} onChange={(event) => setDraftSettings({ ...draftSettings, icloudAppPassword: event.target.value })} />
        </label>
        <label>
          {lang === 'zh' ? 'Reminders 列表名' : 'Reminders list name'}
          <input value={draftSettings.remindersListName} onChange={(event) => setDraftSettings({ ...draftSettings, remindersListName: event.target.value })} />
        </label>
      </section>

      <section className="settings-toggle-grid">
        <label className="switch-row">
          <input checked={draftSettings.calendarSync} type="checkbox" onChange={(event) => setDraftSettings({ ...draftSettings, calendarSync: event.target.checked })} />
          <span>{lang === 'zh' ? '启用 Apple Calendar 同步预留' : 'Enable Apple Calendar sync placeholder'}</span>
        </label>
        <label className="switch-row">
          <input checked={draftSettings.notesSync} type="checkbox" onChange={(event) => setDraftSettings({ ...draftSettings, notesSync: event.target.checked })} />
          <span>{lang === 'zh' ? '启用 Apple Notes 同步预留' : 'Enable Apple Notes sync placeholder'}</span>
        </label>
        <label className="switch-row">
          <input checked={draftSettings.aiEnabled} type="checkbox" onChange={(event) => setDraftSettings({ ...draftSettings, aiEnabled: event.target.checked })} />
          <span>{lang === 'zh' ? '启用 AI 自动安排接口' : 'Enable AI scheduling endpoint'}</span>
        </label>
      </section>

      <div className="editor-actions">
        <button className="primary-action" type="button" onClick={saveSettings}>{lang === 'zh' ? '保存设置' : 'Save settings'}</button>
      </div>
      {status && <p className="api-status">{status}</p>}
    </div>
  )
}

function ModuleShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <section className="module-page"><article className="module-card full-card"><header><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></header>{children}</article></section>
}

function PhotoGrid({ lang, large = false }: { lang: Lang; large?: boolean }) {
  return (
    <div className={`photo-grid ${large ? 'large' : ''}`}>
      <div className="photo-swatch lunch">{lang === 'zh' ? '午餐' : 'Lunch'}</div>
      <div className="photo-swatch desk">{lang === 'zh' ? '工作台' : 'Desk'}</div>
      <button className="upload-tile" type="button"><Icon name="plus" /></button>
    </div>
  )
}

function pageTitle(page: Page, lang: Lang) {
  return text[lang][page]
}

export default App
