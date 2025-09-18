import AppLayout from '@/components/AppLayout'
import { getServerProfile } from '@/lib/auth-server'
import MessagesManagementClient from './MessagesManagementClient'

export const dynamic = 'force-dynamic'


export default async function MessagesPage() {
  const profile = await getServerProfile()

  return (
    <AppLayout 
      title="Gestión de Mensajes" 
      subtitle="Descarga reportes del historial de consultas de usuarios"
      showBackButton={true}
      backHref="/admin"
      profile={profile}
    >
      <MessagesManagementClient />
    </AppLayout>
  )
}