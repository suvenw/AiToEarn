/**
 * LoginMethodTabs - 登录方式切换
 * 默认根据 isChina 决定首个 Tab（China → 手机 / 其他 → 邮箱）。
 * 支持 ?method=email|phone|account|register 记忆选中项。
 * 「手机」Tab 内含「验证码 / 密码」子切换。
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

import { AccountPasswordLoginForm } from '@/app/[lng]/auth/login/components/LoginContent/AccountPasswordLoginForm'
import { EmailLoginForm } from '@/app/[lng]/auth/login/components/LoginContent/EmailLoginForm'
import { PhoneLoginForm } from '@/app/[lng]/auth/login/components/LoginContent/PhoneLoginForm'
import { PhonePasswordLoginForm } from '@/app/[lng]/auth/login/components/LoginContent/PhonePasswordLoginForm'
import { RegisterAccountForm } from '@/app/[lng]/auth/login/components/LoginContent/RegisterAccountForm'
import { useTransClient } from '@/app/i18n/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/utils/className'
import { isChina } from '@/constant'

type LoginMethod = 'email' | 'phone' | 'account' | 'register'
type PhoneMode = 'code' | 'password'

interface LoginMethodTabsProps {
  onLoginSuccess?: () => void
  redirectUrl?: string
  inviteCode?: string
  variant?: 'page' | 'dialog'
}

const VALID_METHODS: LoginMethod[] = ['email', 'phone', 'account', 'register']

export function LoginMethodTabs({
  onLoginSuccess,
  redirectUrl,
  inviteCode,
}: LoginMethodTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTransClient('login')
  const [phoneMode, setPhoneMode] = useState<PhoneMode>('code')

  const defaultMethod: LoginMethod = useMemo(() => {
    const fromQuery = searchParams.get('method') as LoginMethod | null
    if (fromQuery && VALID_METHODS.includes(fromQuery))
      return fromQuery
    return isChina ? 'phone' : 'email'
  }, [searchParams])

  const handleChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('method', val)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const commonFormProps = {
    onLoginSuccess,
    redirectUrl,
    inviteCode,
  }

  return (
    <Tabs defaultValue={defaultMethod} onValueChange={handleChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4 rounded-xl bg-muted/60 p-1">
        <TabsTrigger value="email" className="rounded-lg text-xs">{t('tabEmail')}</TabsTrigger>
        <TabsTrigger value="phone" className="rounded-lg text-xs">{t('tabPhone')}</TabsTrigger>
        <TabsTrigger value="account" className="rounded-lg text-xs">{t('tabAccount')}</TabsTrigger>
        <TabsTrigger value="register" className="rounded-lg text-xs">{t('tabRegisterAccount')}</TabsTrigger>
      </TabsList>

      <TabsContent value="email" className="mt-6">
        <EmailLoginForm {...commonFormProps} />
      </TabsContent>

      <TabsContent value="phone" className="mt-6">
        <div className="mb-4 flex gap-2 rounded-lg bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setPhoneMode('code')}
            className={cn(
              'flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors',
              phoneMode === 'code'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t('phoneModeCode')}
          </button>
          <button
            type="button"
            onClick={() => setPhoneMode('password')}
            className={cn(
              'flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors',
              phoneMode === 'password'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t('phoneModePassword')}
          </button>
        </div>
        {phoneMode === 'code'
          ? (
              <PhoneLoginForm {...commonFormProps} />
            )
          : (
              <PhonePasswordLoginForm {...commonFormProps} />
            )}
      </TabsContent>

      <TabsContent value="account" className="mt-6">
        <AccountPasswordLoginForm {...commonFormProps} />
        <p className="mt-3 text-center text-xs text-muted-foreground/70">
          {t('noAccountYet')}
          {' '}
          <button
            type="button"
            className="cursor-pointer text-muted-foreground underline hover:text-foreground"
            onClick={() => handleChange('register')}
          >
            {t('registerAccount')}
          </button>
        </p>
      </TabsContent>

      <TabsContent value="register" className="mt-6">
        <RegisterAccountForm {...commonFormProps} />
        <p className="mt-3 text-center text-xs text-muted-foreground/70">
          {t('haveAccount')}
          {' '}
          <button
            type="button"
            className="cursor-pointer text-muted-foreground underline hover:text-foreground"
            onClick={() => handleChange('account')}
          >
            {t('login')}
          </button>
        </p>
      </TabsContent>
    </Tabs>
  )
}