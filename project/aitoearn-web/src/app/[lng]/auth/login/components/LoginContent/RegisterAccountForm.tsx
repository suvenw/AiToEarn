/**
 * RegisterAccountForm - 账号注册表单
 */

'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { registerByAccountApi } from '@/api/auth/auth.api'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { useUserStore } from '@/store/user'
import { toast } from '@/utils/ui/toast'

interface RegisterAccountFormProps {
  onLoginSuccess?: () => void
  redirectUrl?: string
  inviteCode?: string
}

interface RegisterAccountFormData {
  account: string
  password: string
  confirmPassword: string
}

const ACCOUNT_PATTERN = /^[a-zA-Z0-9_]{4,20}$/
const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d)[\w!@#$%^&*()_+={}\[\]:;"'<>,.?/\\|`~\-]{8,}$/

export function RegisterAccountForm({
  onLoginSuccess,
  redirectUrl,
  inviteCode: inviteCodeProp,
}: RegisterAccountFormProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = redirectUrl ?? searchParams.get('redirect')
  const { setToken, setUserInfo } = useUserStore()
  const { t } = useTransClient('login')

  const schema = useMemo(
    () =>
      z
        .object({
          account: z
            .string()
            .min(1, t('accountPlaceholder'))
            .regex(ACCOUNT_PATTERN, t('accountInvalid')),
          password: z
            .string()
            .min(1, t('passwordRequired'))
            .regex(PASSWORD_POLICY, t('passwordWeak')),
          confirmPassword: z.string().min(1, t('confirmPasswordRequired')),
        })
        .refine(data => data.password === data.confirmPassword, {
          message: t('passwordMismatch'),
          path: ['confirmPassword'],
        }),
    [t],
  )

  const form = useForm<RegisterAccountFormData>({
    resolver: zodResolver(schema),
    defaultValues: { account: '', password: '', confirmPassword: '' },
  })

  const handleSubmit = async (data: RegisterAccountFormData) => {
    try {
      const inviteCode = inviteCodeProp ?? searchParams.get('inviteCode') ?? undefined
      const res = await registerByAccountApi({
        account: data.account,
        password: data.password,
      })
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
    // inviteCode is reserved for future usage
    void inviteCodeProp
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
          autoComplete="new-password"
          {...form.register('password')}
          className="h-12 rounded-xl border-input bg-background px-4 text-base placeholder:text-muted-foreground/70 focus:border-ring focus:ring-0"
        />
        {form.formState.errors.password && (
          <p className="mt-1 text-xs text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <div>
        <PasswordInput
          placeholder={t('confirmPasswordPlaceholder') || t('passwordPlaceholder')}
          autoComplete="new-password"
          {...form.register('confirmPassword')}
          className="h-12 rounded-xl border-input bg-background px-4 text-base placeholder:text-muted-foreground/70 focus:border-ring focus:ring-0"
        />
        {form.formState.errors.confirmPassword && (
          <p className="mt-1 text-xs text-destructive">
            {form.formState.errors.confirmPassword.message}
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
              t('registerAccount')
            )}
      </Button>
    </form>
  )
}