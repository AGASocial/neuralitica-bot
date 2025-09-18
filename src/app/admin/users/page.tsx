import AppLayout from '@/components/AppLayout'
import { getServerProfile } from '@/lib/auth-server'
import UserManagementClient from './UserManagementClient'

export const dynamic = 'force-dynamic'

export default async function UserManagement() {
  const profile = await getServerProfile()

  return (
    <AppLayout 
      title="Gestión de Usuarios" 
      subtitle="Administrar usuarios y suscripciones"
      showBackButton={true}
      backHref="/admin"
      profile={profile}
    >
      <UserManagementClient />
    </AppLayout>
  )
}