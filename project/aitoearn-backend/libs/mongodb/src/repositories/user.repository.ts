import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { UserType } from '../enums'
import { User, UserAiInfo } from '../schemas'
import { BaseRepository, LeanDoc } from './base.repository'

export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectModel(User.name)
    userModel: Model<User>,
  ) {
    super(userModel)
  }

  override async getById(id: string): Promise<LeanDoc<User> | null> {
    let userInfo
    try {
      userInfo = await this.model.findById(id).lean({ virtuals: true }).exec()
    }
    catch {
      return null
    }
    return userInfo as LeanDoc<User> | null
  }

  async getByAccount(account: string): Promise<LeanDoc<User> | null> {
    return this.findOne({ account, isDelete: { $ne: true } })
  }

  async getByMail(mail: string): Promise<LeanDoc<User> | null> {
    return this.findOne({ mail, isDelete: { $ne: true } })
  }

  async getByPhone(phone: string): Promise<LeanDoc<User> | null> {
    return this.findOne({ phone, isDelete: { $ne: true } })
  }

  async countByAccount(account: string): Promise<number> {
    return this.count({ account, isDelete: { $ne: true } })
  }

  async countByPhone(phone: string): Promise<number> {
    return this.count({ phone, isDelete: { $ne: true } })
  }

  async updateAiConfigById(userId: string, aiConfig: Partial<UserAiInfo>): Promise<boolean> {
    const res = await this.model.updateOne(
      { _id: userId },
      { $set: { aiInfo: aiConfig } },
    )
    return res.modifiedCount > 0
  }

  async updateAiConfigItemById(userId: string, type: 'image' | 'edit' | 'video' | 'agent', value: {
    defaultModel: string
    option?: Record<string, any>
  }): Promise<boolean> {
    const res = await this.model.updateOne(
      { _id: userId },
      { $set: { [`aiInfo.${type}`]: { defaultModel: value.defaultModel, option: value.option } } },
    )
    return res.modifiedCount > 0
  }

  async updateUserTypeById(userId: string, userType: UserType): Promise<boolean> {
    const res = await this.model.updateOne(
      { _id: userId },
      { $set: { userType } },
    )
    return res.modifiedCount > 0
  }

  async updatePasswordHashById(userId: string, passwordHash: string, passwordAlgo: string): Promise<boolean> {
    const res = await this.model.updateOne(
      { _id: userId },
      {
        $set: {
          passwordHash,
          passwordAlgo,
          passwordUpdatedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      },
    )
    return res.modifiedCount > 0
  }

  async updatePhoneById(userId: string, phone: string, phoneCountryCode: string): Promise<boolean> {
    const res = await this.model.updateOne(
      { _id: userId },
      { $set: { phone, phoneCountryCode } },
    )
    return res.modifiedCount > 0
  }

  async updateAccountById(userId: string, account: string): Promise<boolean> {
    const res = await this.model.updateOne(
      { _id: userId },
      { $set: { account } },
    )
    return res.modifiedCount > 0
  }

  async updateFailedLoginById(userId: string, failedLoginAttempts: number, lockedUntil?: Date | null): Promise<boolean> {
    const update: Record<string, unknown> = { failedLoginAttempts }
    if (lockedUntil !== undefined)
      update['lockedUntil'] = lockedUntil
    const res = await this.model.updateOne(
      { _id: userId },
      { $set: update },
    )
    return res.modifiedCount > 0
  }
}
