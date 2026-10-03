/**
 * PhonePasswordLoginForm - 手机号+密码登录表单
 */

'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { phonePasswordLoginApi } from '@/api/auth/auth.api'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { useUserStore } from '@/store/user'
import { toast } from '@/utils/ui/toast'

interface PhonePasswordLoginFormProps {
  onLoginSuccess?: () => void
  redirectUrl?: string
  inviteCode?: string
  defaultCountryCode?: string
}

interface PhonePasswordLoginFormData {
  phone: string
  password: string
}

export function PhonePasswordLoginForm({
  onLoginSuccess,
  redirectUrl,
  inviteCode: _inviteCodeProp,
  defaultCountryCode = '+86',
}: PhonePasswordLoginFormProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = redirectUrl ?? searchParams.get('redirect')
  const { setToken, setUserInfo } = useUserStore()
  const { t } = useTransClient('login')

  const schema = useMemo(
    () =>
      z.object({
        phone: z
          .string()
          .min(1, t('phoneRequired'))
          .regex(/^1[3-9]\d{9}$/, t('phoneInvalid')),
        password: z.string().min(1, t('passwordRequired')),
      }),
    [t],
  )

  const form = useForm<PhonePasswordLoginFormData>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', password: '' },
  })

  const handleSubmit = async (data: PhonePasswordLoginFormData) => {
    try {
      const res = await phonePasswordLoginApi({
        phone: data.phone,
        phoneCountryCode: defaultCountryCode,
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
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div>
        <div className="flex">
          <span className="inline-flex h-12 items-center rounded-l-xl border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
            {defaultCountryCode}
          </span>
          <Input
            type="tel"
            inputMode="numeric"
            maxLength={11}
            placeholder={t('phonePlaceholder')}
            {...form.register('phone')}
            className="h-12 rounded-l-none rounded-r-xl border-input bg-background px-4 text-base placeholder:text-muted-foreground/70 focus:border-ring focus:ring-0"
          />
        </div>
        {form.formState.errors.phone && (
          <p className="mt-1 text-xs text-destructive">
            {form.formState.errors.phone.message}
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