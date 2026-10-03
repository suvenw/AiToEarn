import { Body, Controller, Post, Put } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { GetToken, Public, TokenInfo } from '@yikart/aitoearn-auth'
import { ApiDoc } from '@yikart/common'
import {
  LoginByAccountDto,
  LoginByAccountDtoSchema,
  LoginByPhoneDto,
  LoginByPhoneDtoSchema,
  RegisterByAccountDto,
  RegisterByAccountDtoSchema,
  RegisterByPhoneDto,
  RegisterByPhoneDtoSchema,
  UpdatePasswordDto,
  UpdatePasswordDtoSchema,
} from './auth.dto'
import { AuthService } from './auth.service'
import { LoginVo } from './auth.vo'

@ApiTags('Auth/Password')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @ApiDoc({
    summary: '通过账号注册新用户',
    description: '创建账号并设置密码，注册成功直接返回 token',
    body: RegisterByAccountDtoSchema,
    response: LoginVo,
  })
  @Post('register/account')
  async registerByAccount(@Body() body: RegisterByAccountDto) {
    const result = await this.authService.registerByAccount(body)
    return LoginVo.create(result)
  }

  @Public()
  @ApiDoc({
    summary: '通过手机号注册新用户',
    description: '若手机号已存在但未设置密码，将为其补设密码并登录',
    body: RegisterByPhoneDtoSchema,
    response: LoginVo,
  })
  @Post('register/phone')
  async registerByPhone(@Body() body: RegisterByPhoneDto) {
    const result = await this.authService.registerByPhone(body)
    return LoginVo.create(result)
  }

  @Public()
  @ApiDoc({
    summary: '账号密码登录',
    body: LoginByAccountDtoSchema,
    response: LoginVo,
  })
  @Post('login/account')
  async loginByAccount(@Body() body: LoginByAccountDto) {
    const result = await this.authService.loginByAccount(body)
    return LoginVo.create(result)
  }

  @Public()
  @ApiDoc({
    summary: '手机号密码登录',
    body: LoginByPhoneDtoSchema,
    response: LoginVo,
  })
  @Post('login/phone')
  async loginByPhone(@Body() body: LoginByPhoneDto) {
    const result = await this.authService.loginByPhone(body)
    return LoginVo.create(result)
  }

  @ApiDoc({
    summary: '修改当前用户密码',
    description: '已登录用户使用旧密码修改为新密码',
    body: UpdatePasswordDtoSchema,
  })
  @Put('password')
  async updatePassword(
    @GetToken() token: TokenInfo,
    @Body() body: UpdatePasswordDto,
  ) {
    await this.authService.updatePassword(token.id, body)
  }
}