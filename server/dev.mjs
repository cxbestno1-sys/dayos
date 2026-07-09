import { spawn } from 'node:child_process'

const processes = [
  spawn(process.execPath, ['server/api.mjs'], {
    env: process.env,
    stdio: 'inherit',
  }),
  spawn('npm', ['run', 'dev:web', '--', '--host', '127.0.0.1', '--port', '5175'], {
    env: process.env,
    stdio: 'inherit',
  }),
]

function shutdown(signal) {
  for (const child of processes) child.kill(signal)
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

for (const child of processes) {
  child.on('exit', (code) => {
    if (code && code !== 0) {
      for (const other of processes) {
        if (other !== child) other.kill('SIGTERM')
      }
      process.exit(code)
    }
  })
}
