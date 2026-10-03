import { createZodDto } from '@yikart/common'
import { UserInfoVo } from '@yikart/aitoearn-server-shared'
import { z } from 'zod'

export const LoginVoSchema = z.object({
  token: z.string().min(1).describe('JWT 令牌'),
  userInfo: UserInfoVo.schema.describe('用户信息'),
})
export class LoginVo extends createZodDto(LoginVoSchema, 'LoginVo') {}