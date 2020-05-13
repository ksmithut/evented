import path from 'path'
import { URL } from 'url'
import { spawn } from 'child_process'

async function runMessageDBScript (
  postgresURI: string,
  script: string,
  env: { [key: string]: string },
  { silent }: { silent: boolean }
) {
  const installPath = require.resolve(
    '@eventide/message-db/database/install.sh'
  )
  const BASE_PATH = path.dirname(installPath)
  const scriptPath = path.join(BASE_PATH, script)
  const url = new URL(postgresURI)
  const databaseName = url.pathname.replace(/^\//, '') || 'message_store'
  await new Promise((resolve, reject) => {
    const install = spawn(scriptPath, {
      cwd: BASE_PATH,
      env: {
        PGHOST: url.hostname,
        PGPORT: url.port || '5432',
        PGDATABASE: databaseName,
        DATABASE_NAME: databaseName,
        PGUSER: url.username,
        PGPASSWORD: url.password,
        PATH: process.env.PATH,
        ...env
      },
      stdio: silent ? 'ignore' : 'inherit'
    })
    install.on('close', code => {
      if (code === 0) return resolve()
      reject(new Error(`${scriptPath} exited with code ${code}`))
    })
  })
}

export async function install (
  postgresURI: string,
  {
    createDatabase = true,
    silent = false
  }: { createDatabase?: boolean; silent?: boolean } = {}
) {
  await runMessageDBScript(
    postgresURI,
    'install.sh',
    {
      CREATE_DATABASE: createDatabase ? 'on' : 'off'
    },
    { silent }
  )
}

// eslint-disable-next-line camelcase
export async function update1_0_0 (
  postgresURI: string,
  { silent = false }: { silent?: boolean } = {}
) {
  await runMessageDBScript(
    postgresURI,
    path.join('update', '1.0.0.sh'),
    {},
    { silent }
  )
}

// eslint-disable-next-line camelcase
export async function update1_2_2 (
  postgresURI: string,
  { silent = false }: { silent?: boolean } = {}
) {
  await runMessageDBScript(
    postgresURI,
    path.join('update', '1.2.2.sh'),
    {},
    { silent }
  )
}
