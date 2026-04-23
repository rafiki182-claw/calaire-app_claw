import { WorkOS } from '@workos-inc/node'

let _workos: WorkOS | null = null

function getWorkOS(): WorkOS {
  if (!_workos) {
    _workos = new WorkOS(process.env.WORKOS_API_KEY!)
  }
  return _workos
}

export type WorkOSUserResult = {
  id: string
  email: string
  displayName: string
}

export async function findUserByEmail(email: string): Promise<WorkOSUserResult | null> {
  const { data } = await getWorkOS().userManagement.listUsers({
    email,
    limit: 1,
  })

  const user = data[0]
  if (!user) return null

  const parts = [user.firstName, user.lastName].filter(Boolean)
  return {
    id: user.id,
    email: user.email,
    displayName: parts.length > 0 ? parts.join(' ') : user.email,
  }
}

export async function createWorkOSUser(
  email: string,
  firstName?: string,
  lastName?: string,
): Promise<WorkOSUserResult> {
  const user = await getWorkOS().userManagement.createUser({
    email,
    emailVerified: false,
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
  })

  const parts = [user.firstName, user.lastName].filter(Boolean)
  return {
    id: user.id,
    email: user.email,
    displayName: parts.length > 0 ? parts.join(' ') : user.email,
  }
}
