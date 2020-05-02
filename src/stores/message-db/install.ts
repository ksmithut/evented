import path from 'path'
import { URL } from 'url'
import { spawn } from 'child_process'

function createRunScript (script: string) {
  return async (postgresURI: string) => {
    const installPath = require.resolve(
      '@eventide/message-db/database/install.sh'
    )
    const BASE_PATH = path.dirname(installPath)
    const scriptPath = path.join(BASE_PATH, script)
    const url = new URL(postgresURI)
    const databaseName = url.pathname.replace(/^\//, '') || 'message_store'
    const env = {
      PGHOST: url.hostname,
      PGPORT: url.port || '5432',
      PGDATABASE: databaseName,
      DATABASE_NAME: databaseName,
      PGUSER: url.username,
      PGPASSWORD: url.password,
      PATH: process.env.PATH
    }
    await new Promise((resolve, reject) => {
      const install = spawn(scriptPath, {
        cwd: BASE_PATH,
        env,
        stdio: 'inherit'
      })
      install.on('close', code => {
        if (code === 0) return resolve()
        reject(new Error(`${scriptPath} exited with code ${code}`))
      })
    })
  }
}

export const install = createRunScript('install.sh')

export const update1_0_0 = createRunScript(path.join('update', '1.0.0.sh')) // eslint-disable-line camelcase
