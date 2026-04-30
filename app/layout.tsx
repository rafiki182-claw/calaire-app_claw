import type { Metadata } from 'next'
import './globals.css'
import { ConvexClientProvider } from './providers'

export const metadata: Metadata = {
  title: 'CALAIRE APP',
  description: 'Dashboard para Ensayos de Aptitud de Calidad de Aire',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  )
}
