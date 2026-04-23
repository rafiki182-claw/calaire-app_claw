import { redirect } from 'next/navigation'
import { withAuth } from '@workos-inc/authkit-nextjs'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await withAuth({ ensureSignedIn: true }).catch(() => ({ user: null }))
  if (!user) redirect('/login')

  return <>{children}</>
}
