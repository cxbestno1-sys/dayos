module.exports = {
  apps: [
    {
      name: 'dayos-api',
      script: 'server/api.mjs',
      cwd: __dirname,
      env: {
        DAYOS_API_PORT: '8787',
        DAYOS_API_TOKEN: 'change-this-token-before-deploy',
        DAYOS_DEFAULT_USER_EMAIL: 'test@dayos.local',
        DAYOS_DB_HOST: '127.0.0.1',
        DAYOS_DB_PORT: '3306',
        DAYOS_DB_USER: 'dayos',
        DAYOS_DB_PASSWORD: 'change-this-db-password',
        DAYOS_DB_NAME: 'dayos',
        NODE_ENV: 'production',
      },
    },
  ],
}
