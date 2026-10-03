/**
 * ProfilePage - 个人资料展示与编辑
 * /[lng]/profile 路由
 */

'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Edit3, Loader2, Mail, Phone, Save, User as UserIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useShallow } from 'zustand/shallow'
import { z } from 'zod'

import { updateUserInfoApi } from '@/api/auth/auth.api'
import { uploadToOss } from '@/api/materials/material.api'
import { useTransClient } from '@/app/i18n/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useUserStore } from '@/store/user'
import { cn } from '@/utils/className'
import { getOssUrl } from '@/utils/oss'
import { toast } from '@/utils/ui/toast'

const PHONE_PATTERN = /^1[3-9]\d{9}$/

const profileSchema = z.object({
  name: z.string().min(1).max(50),
  bio: z.string().max(500),
  phone: z.string(),
  phoneCountryCode: z.string().regex(/^\+\d{1,4}$/),
})
type ProfileFormData = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const router = useRouter()
  const { t } = useTransClient('common')

  const { userInfo, getUserInfo, logout } = useUserStore(
    useShallow(state => ({
      userInfo: state.userInfo,
      getUserInfo: state.getUserInfo,
      logout: state.logout,
    })),
  )
  const hasHydrated = useUserStore(state => state._hasHydrated)

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userInfo?.name || '',
      bio: userInfo?.bio || '',
      phone: userInfo?.phone || '',
      phoneCountryCode: userInfo?.phoneCountryCode || '+86',
    },
  })

  // 每次 userInfo 变化时同步表单
  useEffect(() => {
    if (userInfo) {
      form.reset({
        name: userInfo.name || '',
        bio: userInfo.bio || '',
        phone: userInfo.phone || '',
        phoneCountryCode: userInfo.phoneCountryCode || '+86',
      })
    }
  }, [userInfo, form])

  // 未登录：跳转到首页
  useEffect(() => {
    if (hasHydrated && !useUserStore.getState().token) {
      router.replace('/zh-CN')
    }
  }, [hasHydrated, router])

  if (!hasHydrated || !userInfo) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  const handleAvatarClick = () => {
    if (!isEditing)
      return
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file)
      return
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片不能超过 5MB')
      return
    }
    setIsUploadingAvatar(true)
    try {
      const ossPath = await uploadToOss(file)
      await updateUserInfoApi({ name: userInfo.name || '', avatar: ossPath })
      await getUserInfo()
      toast.success('头像已更新')
    }
    catch {
      toast.error('头像上传失败')
    }
    finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current)
        fileInputRef.current.value = ''
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    setIsSaving(true)
    try {
      const res = await updateUserInfoApi({
        name: data.name,
        bio: data.bio || undefined,
        phone: data.phone || undefined,
        phoneCountryCode: data.phone ? data.phoneCountryCode : undefined,
      })
      if (res?.code === 0) {
        await getUserInfo()
        toast.success(t('profileUpdated'))
        setIsEditing(false)
      }
      else {
        toast.error(res?.message || t('profileSaveFailed'))
      }
    }
    catch {
      toast.error(t('profileSaveFailed'))
    }
    finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    form.reset({
      name: userInfo.name || '',
      bio: userInfo.bio || '',
      phone: userInfo.phone || '',
      phoneCountryCode: userInfo.phoneCountryCode || '+86',
    })
    setIsEditing(false)
  }

  const avatarUrl = userInfo.avatar ? getOssUrl(userInfo.avatar) : ''

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('profile')}</h1>
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            data-testid="profile-edit-btn"
          >
            <Edit3 className="mr-1.5 h-4 w-4" />
            {t('editProfile')}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
          <CardDescription>头像、昵称、账号等公开信息</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={!isEditing || isUploadingAvatar}
                className={cn(
                  'group relative block rounded-full',
                  isEditing && 'cursor-pointer hover:opacity-80',
                  !isEditing && 'cursor-default',
                )}
                data-testid="profile-avatar-trigger"
              >
                <Avatar className="h-24 w-24 border-2 border-border">
                  <AvatarImage src={avatarUrl} alt={userInfo.name} />
                  <AvatarFallback className="bg-muted-foreground text-2xl font-semibold text-background">
                    {userInfo.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    {isUploadingAvatar
                      ? (
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        )
                      : (
                          <Camera className="h-6 w-6 text-white" />
                        )}
                  </div>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex-1 space-y-4"
              data-testid="profile-form"
            >
              {/* 账号（只读） */}
              <FieldRow
                icon={<UserIcon className="h-4 w-4" />}
                label={t('fieldAccount')}
              >
                <span className="text-sm text-foreground">
                  {(userInfo as any).account || t('fieldMailNotSet')}
                </span>
              </FieldRow>

              {/* 邮箱（只读） */}
              <FieldRow
                icon={<Mail className="h-4 w-4" />}
                label={t('fieldMail')}
              >
                <span className="text-sm text-foreground">
                  {userInfo.mail || t('fieldMailNotSet')}
                </span>
              </FieldRow>

              {/* 昵称（可编辑） */}
              <FieldRow
                icon={<UserIcon className="h-4 w-4" />}
                label={t('fieldName')}
              >
                {isEditing
                  ? (
                      <input
                        {...form.register('name')}
                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none"
                        data-testid="profile-name-input"
                      />
                    )
                  : (
                      <span className="text-sm text-foreground">{userInfo.name}</span>
                    )}
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </FieldRow>

              {/* 手机号（可编辑） */}
              <FieldRow
                icon={<Phone className="h-4 w-4" />}
                label={t('fieldPhone')}
              >
                {isEditing
                  ? (
                      <div className="flex gap-2">
                        <input
                          {...form.register('phoneCountryCode')}
                          defaultValue="+86"
                          className="w-16 rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:border-ring focus:outline-none"
                        />
                        <input
                          {...form.register('phone')}
                          placeholder={t('fieldPhoneNotSet')}
                          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none"
                          data-testid="profile-phone-input"
                        />
                      </div>
                    )
                  : (
                      <span className="text-sm text-foreground">
                        {userInfo.phone
                          ? `${userInfo.phoneCountryCode || ''} ${userInfo.phone}`
                          : t('fieldPhoneNotSet')}
                      </span>
                    )}
                {form.formState.errors.phone && (
                  <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                )}
              </FieldRow>

              {/* 个人简介（可编辑） */}
              <FieldRow
                icon={<Edit3 className="h-4 w-4" />}
                label={t('fieldBio')}
              >
                {isEditing
                  ? (
                      <div>
                        <textarea
                          {...form.register('bio')}
                          rows={4}
                          maxLength={500}
                          placeholder={t('fieldBioPlaceholder')}
                          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none"
                          data-testid="profile-bio-input"
                        />
                        <p className="mt-1 text-right text-xs text-muted-foreground">
                          {(form.watch('bio') || '').length}
                          /500
                        </p>
                      </div>
                    )
                  : (
                      <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                        {userInfo.bio || t('noBio')}
                      </p>
                    )}
                {form.formState.errors.bio && (
                  <p className="text-xs text-destructive">{form.formState.errors.bio.message}</p>
                )}
              </FieldRow>

              {/* 操作按钮 */}
              {isEditing && (
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    {t('cancel')}
                  </Button>
                  <Button type="submit" disabled={isSaving} data-testid="profile-save-btn">
                    {isSaving
                      ? (
                          <>
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            {t('saving')}
                          </>
                        )
                      : (
                          <>
                            <Save className="mr-1.5 h-4 w-4" />
                            {t('saveProfile')}
                          </>
                        )}
                  </Button>
                </div>
              )}
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FieldRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-start gap-3">
      <div className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}
