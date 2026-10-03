import type { UserInfo } from '@/store/user'

// Source: types/auth.ts

/**
 * SendEmailCodeParams 请求参数。
 */
export interface SendEmailCodeParams {
  mail: string
}

/**
 * EmailCodeLoginParams 请求参数。
 */
export interface EmailCodeLoginParams {
  mail: string
  code: string
  inviteCode?: string
}

/**
 * SendPhoneCodeParams 请求参数。
 */
export interface SendPhoneCodeParams {
  phone: string
}

/**
 * PhoneCodeLoginParams 请求参数。
 */
export interface PhoneCodeLoginParams {
  phone: string
  code: string
}

/**
 * CodeLoginResponse 响应数据。
 */
export interface CodeLoginResponse {
  token?: string
  userInfo?: UserInfo
}

// Source: auth/auth.api.ts inline types
// Source: apiReq.ts

/**
 * LoginResponse 响应数据。
 */
export interface LoginResponse {
  token?: string
  userInfo?: UserInfo
}

/**
 * GoogleLoginParams 请求参数。
 */
export interface GoogleLoginParams {
  clientId: string
  credential: string
  placeId?: string
}

/**
 * 鉴权请求选项。
 */
export interface AuthRequestOptions {
  silent?: boolean
}

/**
 * 更新用户信息请求参数。
 */
export interface UpdateUserInfoParams {
  name: string
  avatar?: string
}

/**
 * 账号密码注册请求参数。
 */
export interface RegisterByAccountParams {
  account: string
  password: string
  mail?: string
  phone?: string
  phoneCountryCode?: string
}

/**
 * 手机号密码注册请求参数。
 */
export interface RegisterByPhoneParams {
  phone: string
  phoneCountryCode: string
  password: string
}

/**
 * 账号密码登录请求参数。
 */
export interface LoginByAccountParams {
  account: string
  password: string
}

/**
 * 手机号密码登录请求参数。
 */
export interface LoginByPhoneParams {
  phone: string
  phoneCountryCode: string
  password: string
}

/**
 * 修改密码请求参数。
 */
export interface UpdatePasswordParams {
  oldPassword: string
  newPassword: string
}
