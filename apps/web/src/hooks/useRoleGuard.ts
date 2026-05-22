import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { UserRole } from '@ims-pro/types'

export function useRoleGuard(allowedRoles: UserRole[]) {
  const { user, isLoading } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) { router.replace('/login'); return }
    if (!allowedRoles.includes(user.role)) router.replace('/dashboard')
  }, [user, isLoading, router, allowedRoles])

  const allowed = !isLoading && !!user && allowedRoles.includes(user.role)
  return { allowed, isLoading }
}
