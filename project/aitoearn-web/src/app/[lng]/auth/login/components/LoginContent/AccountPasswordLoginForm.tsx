/**
 * AccountPasswordLoginForm - 账号+密码登录表单
 */

'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { accountPasswordLoginApi } from '@/api/auth/auth.api'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { useUserStore } from '@/store/user'
import { toast } from '@/utils/ui/toast'

interface AccountPasswordLoginFormProps {
  onLoginSuccess?: () => void
  redirectUrl?: string
  inviteCode?: string
}

interface AccountPasswordLoginFormData {
  account: string
  password: string
}

export function AccountPasswordLoginForm({
  onLoginSuccess,
  redirectUrl,
  inviteCode: _inviteCodeProp,
}: AccountPasswordLoginFormProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = redirectUrl ?? searchParams.get('redirect')
  const { setToken, setUserInfo } = useUserStore()
  const { t } = useTransClient('login')

  const schema = useMemo(
    () =>
      z.object({
        account: z.string().min(1, t('accountPlaceholder')),
        password: z.string().min(1, t('passwordRequired')),
      }),
    [t],
  )

  const form = useForm<AccountPasswordLoginFormData>({
    resolver: zodResolver(schema),
    defaultValues: { account: '', password: '' },
  })

  const handleSubmit = async (data: AccountPasswordLoginFormData) => {
    try {
      const res = await accountPasswordLoginApi({ account: data.account, password: data.password })
      if (!res)
        return

      if (res.code === 0 && res.data?.token) {
        setToken(res.data.token)
        if (res.data.userInfo)
          setUserInfo(res.data.userInfo)
        toast.success(t('loginSuccess'))
        if (onLoginSuccess)
          onLoginSuccess()
        else
          router.push(redirect || '/')
      }
      else {
        toast.error(res.message || t('loginFailed'))
      }
    }
    catch {
      toast.error(t('loginError'))
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div>
        <Input
          placeholder={t('accountPlaceholder')}
          autoComplete="username"
          {...form.register('account')}
          className="h-12 rounded-xl border-input bg-background px-4 text-base placeholder:text-muted-foreground/70 focus:border-ring focus:ring-0"
        />
        {form.formState.errors.account && (
          <p className="mt-1 text-xs text-destructive">
            {form.formState.errors.account.message}
          </p>
        )}
      </div>

      <div>
        <PasswordInput
          placeholder={t('passwordPlaceholder')}
          autoComplete="current-password"
          {...form.register('password')}
          className="h-12 rounded-xl border-input bg-background px-4 text-base placeholder:text-muted-foreground/70 focus:border-ring focus:ring-0"
        />
        {form.formState.errors.password && (
          <p className="mt-1 text-xs text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="h-12 w-full cursor-pointer rounded-xl text-base font-medium"
      >
        {form.formState.isSubmitting
          ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )
          : (
              t('login')
            )}
      </Button>
    </form>
  )
}