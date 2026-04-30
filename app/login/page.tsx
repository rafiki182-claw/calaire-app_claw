import { withAuth } from '@workos-inc/authkit-nextjs'
import { redirect } from 'next/navigation'

import { LogoUnal } from '@/app/components/LogoUnal'

export default async function LoginPage() {
  const { user } = await withAuth()
  if (user) redirect('/dashboard')

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--background)' }}
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <LogoUnal height={64} />

        <div className="card-accent w-full p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: 'var(--foreground)' }}
            >
              CALAIRE APP
            </h1>
            <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
              Dashboard para Ensayos de Aptitud de Calidad de Aire
            </p>
          </div>

          <a href="/login/start" className="btn-primary">
            Ingresar con correo electrónico
          </a>

          <p className="text-xs text-center" style={{ color: 'var(--foreground-muted)' }}>
            Recibirás un enlace de acceso en tu correo registrado.
          </p>
        </div>
      </div>
    </div>
  )
}
