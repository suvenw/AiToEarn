import { JwtService } from '@nestjs/jwt'
import { Injectable, Logger } from '@nestjs/common'
import { AppException, ResponseCode } from '@yikart/common'
import { hashPassword as hashAuthPassword, signToken as signAuthToken, verifyPassword as verifyAuthPassword } from '@yikart/aitoearn-auth'
import type { TokenPayload } from '@yikart/aitoearn-auth'
import { UserRepository, UserStatus, UserType } from '@yikart/mongodb'
import { config } from '../../config'
import { LoginByAccountDto, LoginByPhoneDto, RegisterByAccountDto, RegisterByPhoneDto, UpdatePasswordDto } from './auth.dto'

const MAX_FAILED_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly jwtService: JwtService
  private readonly userRepository: UserRepository
  private readonly passwordHashRounds: number
  private readonly tokenTtl: `${number}${'d' | 'h' | 'm' | 's'}`
  private readonly jwtSecret: string

  constructor(jwtService: JwtService, userRepository: UserRepository) {
    this.jwtService = jwtService
    this.userRepository = userRepository
    this.passwordHashRounds = config.auth.passwordHashRounds
    this.tokenTtl = config.auth.tokenTtl as `${number}${'d' | 'h' | 'm' | 's'}`
    this.jwtSecret = config.auth.secret
  }

  async registerByAccount(input: RegisterByAccountDto) {
    const existing = await this.userRepository.countByAccount(input.account)
    if (existing > 0)
      throw new AppException(ResponseCode.AccountAlreadyExists, { account: input.account })

    if (input.phone) {
      const phoneExists = await this.userRepository.countByPhone(input.phone)
      if (phoneExists > 0)
        throw new AppException(ResponseCode.PhoneAlreadyBound, { phone: input.phone })
    }

    const passwordHash = await hashAuthPassword(input.password, this.passwordHashRounds)

    const user = await this.userRepository.create({
      name: input.account,
      account: input.account,
      mail: input.mail,
      phone: input.phone,
      phoneCountryCode: input.phoneCountryCode,
      passwordHash,
      passwordAlgo: 'bcrypt',
      passwordUpdatedAt: new Date(),
      failedLoginAttempts: 0,
      userType: UserType.CREATOR,
      status: UserStatus.OPEN,
      isDelete: false,
    })

    return this.issueLoginResult(user.id, user.mail)
  }

  async registerByPhone(input: RegisterByPhoneDto) {
    const existing = await this.userRepository.getByPhone(input.phone)
    if (existing) {
      if (existing.passwordHash)
        throw new AppException(ResponseCode.PhoneAlreadyBound, { phone: input.phone })

      const passwordHash = await hashAuthPassword(input.password, this.passwordHashRounds)
      await this.userRepository.updatePasswordHashById(existing.id, passwordHash, 'bcrypt')
      await this.userRepository.updatePhoneById(existing.id, input.phone, input.phoneCountryCode)
      return this.issueLoginResult(existing.id, existing.mail)
    }

    const passwordHash = await hashAuthPassword(input.password, this.passwordHashRounds)
    const user = await this.userRepository.create({
      name: `user_${input.phone.slice(-4)}`,
      phone: input.phone,
      phoneCountryCode: input.phoneCountryCode,
      passwordHash,
      passwordAlgo: 'bcrypt',
      passwordUpdatedAt: new Date(),
      failedLoginAttempts: 0,
      userType: UserType.CREATOR,
      status: UserStatus.OPEN,
      isDelete: false,
    })
    return this.issueLoginResult(user.id, user.mail)
  }

  async loginByAccount(input: LoginByAccountDto) {
    const user = await this.userRepository.getByAccount(input.account)
    if (!user)
      throw new AppException(ResponseCode.InvalidCredentials)

    this.assertUserLoginable(user)
    if (!user.passwordHash)
      throw new AppException(ResponseCode.AccountNotSet)

    const valid = await verifyAuthPassword(input.password, user.passwordHash)
    if (!valid) {
      await this.recordFailedLogin(user.id, user.failedLoginAttempts ?? 0)
      throw new AppException(ResponseCode.InvalidCredentials)
    }

    await this.userRepository.updateFailedLoginById(user.id, 0, null)
    return this.issueLoginResult(user.id, user.mail)
  }

  async loginByPhone(input: LoginByPhoneDto) {
    const user = await this.userRepository.getByPhone(input.phone)
    if (!user)
      throw new AppException(ResponseCode.InvalidCredentials)

    this.assertUserLoginable(user)
    if (!user.passwordHash)
      throw new AppException(ResponseCode.AccountNotSet)

    const valid = await verifyAuthPassword(input.password, user.passwordHash)
    if (!valid) {
      await this.recordFailedLogin(user.id, user.failedLoginAttempts ?? 0)
      throw new AppException(ResponseCode.InvalidCredentials)
    }

    await this.userRepository.updateFailedLoginById(user.id, 0, null)
    return this.issueLoginResult(user.id, user.mail)
  }

  async updatePassword(userId: string, input: UpdatePasswordDto) {
    const user = await this.userRepository.getById(userId)
    if (!user)
      throw new AppException(ResponseCode.UserNotFound)

    if (!user.passwordHash)
      throw new AppException(ResponseCode.AccountNotSet)

    const valid = await verifyAuthPassword(input.oldPassword, user.passwordHash)
    if (!valid)
      throw new AppException(ResponseCode.InvalidCredentials)

    const passwordHash = await hashAuthPassword(input.newPassword, this.passwordHashRounds)
    await this.userRepository.updatePasswordHashById(user.id, passwordHash, 'bcrypt')
  }

  private assertUserLoginable(user: { status?: UserStatus, isDelete?: boolean, lockedUntil?: Date | null }) {
    if (user.isDelete || user.status !== UserStatus.OPEN)
      throw new AppException(ResponseCode.UserStatusError)

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now())
      throw new AppException(ResponseCode.AccountLocked, { lockedUntil: user.lockedUntil })
  }

  private async recordFailedLogin(userId: string, currentAttempts: number): Promise<void> {
    const next = currentAttempts + 1
    if (next >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS)
      await this.userRepository.updateFailedLoginById(userId, 0, lockedUntil)
      this.logger.warn(`Account ${userId} locked until ${lockedUntil.toISOString()} after ${next} failed attempts`)
    }
    else {
      await this.userRepository.updateFailedLoginById(userId, next, null)
    }
  }

  private async issueLoginResult(userId: string, mail?: string) {
    const payload: Omit<TokenPayload, 'exp'> = { id: userId, mail }
    const token = await signAuthToken(this.jwtService, payload, {
      expiresIn: this.tokenTtl,
      secret: this.jwtSecret,
    })
    const user = await this.userRepository.getById(userId)
    if (!user)
      throw new AppException(ResponseCode.UserNotFound)
    return { token, userInfo: { ...user, id: String(user.id ?? userId) } }
  }
}