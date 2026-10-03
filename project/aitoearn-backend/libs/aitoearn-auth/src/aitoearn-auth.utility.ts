import type { JwtSignOptions, JwtService } from '@nestjs/jwt'
import { Logger } from '@nestjs/common'
import type { compare as bcryptjsCompare, hash as bcryptjsHash } from 'bcryptjs'
import type { TokenPayload } from './aitoearn-auth.config'

const logger = new Logger('AitoearnAuthUtility')

const PASSWORD_HASH_PREFIX = '$2'

type BcryptModule = { hash: typeof bcryptjsHash, compare: typeof bcryptjsCompare }

let bcryptModule: BcryptModule | null = null

async function loadBcrypt(): Promise<BcryptModule> {
  if (bcryptModule)
    return bcryptModule
  // eslint-disable-next-line ts/no-require-imports
  const mod = (await import('bcryptjs')) as { default?: BcryptModule } & BcryptModule
  bcryptModule = mod.default ?? mod
  return bcryptModule
}

export interface SignTokenOptions {
  expiresIn?: JwtSignOptions['expiresIn']
  secret?: string
}

export async function signToken(
  jwtService: JwtService,
  payload: Omit<TokenPayload, 'exp'>,
  options: SignTokenOptions = {},
): Promise<string> {
  const { expiresIn = '7d', secret } = options
  const signOptions: JwtSignOptions = { expiresIn }
  if (secret)
    signOptions.secret = secret
  return jwtService.signAsync(payload, signOptions)
}

export async function hashPassword(plain: string, rounds: number): Promise<string> {
  if (!plain || plain.length < 8)
    throw new Error('Password must be at least 8 characters')
  const bcrypt = await loadBcrypt()
  return bcrypt.hash(plain, rounds)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash)
    return false
  if (!hash.startsWith(PASSWORD_HASH_PREFIX)) {
    logger.warn('Password hash is not a bcrypt hash; refusing to verify')
    return false
  }
  const bcrypt = await loadBcrypt()
  return bcrypt.compare(plain, hash)
}