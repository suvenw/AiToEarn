/**
 * Migration: 2026-10-03-add-password-fields
 * 为 user 集合新增密码登录相关字段与唯一索引。
 *
 * 执行方式：
 *   mongosh "$MONGO_URI" --file migrations/2026-10-03-add-password-fields.js
 *
 * 说明：
 *   - account / phone 使用 sparse 唯一索引，保证 NULL 不参与唯一性检查。
 *   - existing users 的 failedLoginAttempts 默认为 0。
 */

const dbName = process.env.DB_NAME || 'aitoearn'

const target = db.getSiblingDB(dbName)
const users = target.user

print('== add-password-fields migration ==')

print('-- ensure account unique sparse index --')
const accountIndex = users.createIndex({ account: 1 }, { unique: true, sparse: true, name: 'account_unique_sparse' })
print('account index: ' + accountIndex)

print('-- ensure phone unique sparse index --')
const phoneIndex = users.createIndex({ phone: 1 }, { unique: true, sparse: true, name: 'phone_unique_sparse' })
print('phone index: ' + phoneIndex)

print('-- backfill failedLoginAttempts default --')
const backfillRes = users.updateMany(
  { failedLoginAttempts: { $exists: false } },
  { $set: { failedLoginAttempts: 0 } },
)
print('matched=' + backfillRes.matchedCount + ' modified=' + backfillRes.modifiedCount)

print('-- backfill passwordAlgo default --')
const algoRes = users.updateMany(
  { passwordAlgo: { $exists: false }, passwordHash: { $exists: true } },
  { $set: { passwordAlgo: 'bcrypt' } },
)
print('matched=' + algoRes.matchedCount + ' modified=' + algoRes.modifiedCount)

print('== migration complete ==')
