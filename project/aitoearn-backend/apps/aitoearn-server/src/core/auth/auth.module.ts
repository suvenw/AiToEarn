import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UserRepository } from '@yikart/mongodb'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtService, UserRepository],
  exports: [AuthService],
})
export class AuthModule {}