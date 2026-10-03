import { createZodDto } from '@yikart/common'
import { z } from 'zod'

/**
 * 密码策略：8+ 字符，至少 1 个字母和 1 个数字。
 * 与前端的 PASSWORD_POLICY 保持同步（src/app/[lng]/auth/login/.../*.tsx）。
 */
export const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d)[\w!@#$%^&*()_+={}\[\]:;"'<>,.?/\\|`~\-]{8,}$/

export const ACCOUNT_PATTERN = /^[a-zA-Z0-9_]{4,20}$/

export const PHONE_PATTERN = /^1[3-9]\d{9}$/

export const RegisterByAccountDtoSchema = z.object({
  account: z
    .string()
    .regex(ACCOUNT_PATTERN, 'Account must be 4-20 chars, letters/digits/underscore')
    .describe('账号'),
  password: z
    .string()
    .regex(PASSWORD_POLICY, 'Password must be 8+ chars and contain a letter and a digit')
    .describe('密码'),
  mail: z.email().optional().describe('邮箱'),
  phone: z
    .string()
    .regex(PHONE_PATTERN, 'Invalid phone')
    .optional()
    .describe('手机号'),
  phoneCountryCode: z
    .string()
    .regex(/^\+\d{1,4}$/, 'Invalid country code')
    .optional()
    .describe('手机号国家代码'),
})
export class RegisterByAccountDto extends createZodDto(RegisterByAccountDtoSchema, 'RegisterByAccountDto') {}

export const RegisterByPhoneDtoSchema = z.object({
  phone: z
    .string()
    .regex(PHONE_PATTERN, 'Invalid phone')
    .describe('手机号'),
  phoneCountryCode: z
    .string()
    .regex(/^\+\d{1,4}$/, 'Invalid country code')
    .describe('手机号国家代码'),
  password: z
    .string()
    .regex(PASSWORD_POLICY, 'Password must be 8+ chars and contain a letter and a digit')
    .describe('密码'),
})
export class RegisterByPhoneDto extends createZodDto(RegisterByPhoneDtoSchema, 'RegisterByPhoneDto') {}

export const LoginByAccountDtoSchema = z.object({
  account: z.string().describe('账号'),
  password: z.string().describe('密码'),
})
export class LoginByAccountDto extends createZodDto(LoginByAccountDtoSchema, 'LoginByAccountDto') {}

export const LoginByPhoneDtoSchema = z.object({
  phone: z.string().regex(PHONE_PATTERN).describe('手机号'),
  phoneCountryCode: z.string().regex(/^\+\d{1,4}$/).describe('手机号国家代码'),
  password: z.string().describe('密码'),
})
export class LoginByPhoneDto extends createZodDto(LoginByPhoneDtoSchema, 'LoginByPhoneDto') {}

export const UpdatePasswordDtoSchema = z.object({
  oldPassword: z.string().describe('旧密码'),
  newPassword: z
    .string()
    .regex(PASSWORD_POLICY, 'Password must be 8+ chars and contain a letter and a digit')
    .describe('新密码'),
})
export class UpdatePasswordDto extends createZodDto(UpdatePasswordDtoSchema, 'UpdatePasswordDto') {}