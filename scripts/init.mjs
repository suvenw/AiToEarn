/**
 * 初始化脚本 - 创建默认 admin 邮箱账号（仅供内部引用，不含密码），
 * 并按需写入自动登录 token。
 *
 * 通过 docker-compose aitoearn-init 服务运行。
 *
 * - 必填：JWT_SECRET（容器启动时校验）
 * - 可选：AUTO_LOGIN_ENABLED=1 时写入 100 年 token 到 AUTO_LOGIN_TOKEN_PATH
 *
 * 不预置带密码的账号。首个可用账号请通过前端注册接口创建。
 */

import { MongoClient } from 'mongodb'
import jwt from 'jsonwebtoken'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import crypto from 'crypto'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:password@mongodb:27017'

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`[init] FATAL: environment variable ${name} is required`)
    process.exit(1)
  }
  return v
}

const JWT_SECRET = requireEnv('JWT_SECRET')
const DB_NAME = process.env.DB_NAME || 'aitoearn'
const TOKEN_PATH = process.env.AUTO_LOGIN_TOKEN_PATH || '/data/init/token.txt'
const AUTO_LOGIN_ENABLED = process.env.AUTO_LOGIN_ENABLED === '1'

const DEFAULT_EMAIL = 'admin@aitoearn.local'

function generatePopularizeCode(identifier, objectId) {
  const phoneHash = crypto.createHash('sha256').update(identifier).digest('hex').substring(0, 16)
  const combinedSalt = `aitoearn${phoneHash}`
  const hash = crypto.createHash('sha256').update(String(objectId)).update(combinedSalt).digest('hex')
  const numericValue = parseInt(hash.substring(0, 6), 16)
  return numericValue.toString(36).slice(-5).toUpperCase().padStart(5, '0')
}

async function ensureIndexes(users) {
  try {
    await users.createIndex({ account: 1 }, { unique: true, sparse: true, name: 'account_unique_sparse' })
  }
  catch (e) {
    console.warn('[init] account index:', e?.message || e)
  }
  try {
    await users.createIndex({ phone: 1 }, { unique: true, sparse: true, name: 'phone_unique_sparse' })
  }
  catch (e) {
    console.warn('[init] phone index:', e?.message || e)
  }
}

async function ensureDefaultAdmin(users) {
  let user = await users.findOne({ mail: DEFAULT_EMAIL, isDelete: { $ne: true } })
  if (!user) {
    const now = new Date()
    const result = await users.insertOne({
      name: 'Admin',
      mail: DEFAULT_EMAIL,
      status: 1,
      userType: 'CREATOR',
      isDelete: false,
      score: 0,
      usedStorage: 0,
      storage: { total: 524288000 },
      locale: 'en-US',
      createdAt: now,
      updatedAt: now,
    })
    user = { _id: result.insertedId, mail: DEFAULT_EMAIL, name: 'Admin' }
    const code = generatePopularizeCode(DEFAULT_EMAIL, result.insertedId)
    await users.updateOne({ _id: user._id }, { $set: { popularizeCode: code } })
    console.log(`[init] Created default email user: ${DEFAULT_EMAIL}`)
  }
  else {
    console.log(`[init] Found existing default user: ${DEFAULT_EMAIL}`)
  }
  return user
}

async function writeAutoLoginToken(user) {
  const token = jwt.sign(
    { id: user._id.toString(), mail: user.mail, name: user.name },
    JWT_SECRET,
    { expiresIn: '100y' },
  )
  mkdirSync(dirname(TOKEN_PATH), { recursive: true })
  writeFileSync(TOKEN_PATH, token)
  console.log(`[init] Auto-login token written to ${TOKEN_PATH}`)
}

async function main() {
  const client = new MongoClient(MONGO_URI)
  await client.connect()
  console.log('[init] Connected to MongoDB')

  const db = client.db(DB_NAME)
  const users = db.collection('user')

  await ensureIndexes(users)
  const defaultUser = await ensureDefaultAdmin(users)

  if (AUTO_LOGIN_ENABLED) {
    await writeAutoLoginToken(defaultUser)
  }
  else {
    console.log('[init] AUTO_LOGIN_ENABLED != 1, skipping auto-login token write')
  }

  await client.close()
  console.log('[init] Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})