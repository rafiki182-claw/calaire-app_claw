function resolveOriginCandidate(value?: string) {
  if (!value) return null

  try {
    return new URL(value).origin
  } catch {
    try {
      return new URL(`https://${value}`).origin
    } catch {
      return null
    }
  }
}

export function getAppOrigin() {
  return (
    resolveOriginCandidate(process.env.NEXT_PUBLIC_APP_URL) ??
    resolveOriginCandidate(process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI) ??
    'http://localhost:3000'
  )
}

export function buildAbsoluteAppUrl(pathname: string) {
  return new URL(pathname, getAppOrigin()).toString()
}
