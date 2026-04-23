import { authkitProxy } from '@workos-inc/authkit-nextjs'

export default authkitProxy({
  // Redirige a /login si el usuario no está autenticado al acceder a rutas protegidas
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/login', '/auth/callback', '/'],
  },
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
