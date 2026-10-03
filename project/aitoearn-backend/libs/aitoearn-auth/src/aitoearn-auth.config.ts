import { createZodDto } from '@yikart/common'
import { z } from 'zod'

export const AITOEARN_AUTH_OPTIONS = Symbol('AITOEARN_AUTH_OPTIONS')

const DEFAULT_UNSAFE_JWT_SECRET = 'change-this-jwt-secret'
const DEFAULT_UNSAFE_INTERNAL_TOKEN = 'change-this-secret-token'

export const aitoearnAuthConfigSchema = z.object({
  secret: z
    .string()
    .min(1)
    .refine(val => val !== DEFAULT_UNSAFE_JWT_SECRET, {
      message: 'auth.secret must be overridden from the default value',
    }),
  internalToken: z
    .string()
    .min(1)
    .refine(val => val !== DEFAULT_UNSAFE_INTERNAL_TOKEN, {
      message: 'auth.internalToken must be overridden from the default value',
    }),
  passwordHashRounds: z.number().int().min(8).max(15).default(10),
  tokenTtl: z.string().default('7d'),
})

export class AitoearnAuthConfig extends createZodDto(aitoearnAuthConfigSchema) {}

export interface TokenPayload {
  readonly id: string
  readonly mail?: string
  readonly name?: string
  readonly shopDomain?: string
  readonly exp?: number
}

export type AitoearnAuthOptions<TTokenInfo = unknown> = AitoearnAuthConfig & {
  getTokenInfo: (payload: TokenPayload) => TTokenInfo | Promise<TTokenInfo>
  getTokenInfoByApiKey?: (apiKey: string) => TTokenInfo | Promise<TTokenInfo>
}
