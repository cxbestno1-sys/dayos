module.exports = {
  apps: [
    {
      name: 'dayos-api',
      script: 'server/api.mjs',
      cwd: __dirname,
      env: {
        DAYOS_API_PORT: '8787',
        DAYOS_API_TOKEN: 'change-this-token-before-deploy',
        NODE_ENV: 'production',
      },
    },
  ],
}
