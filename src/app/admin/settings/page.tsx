import AppLayout from '@/components/AppLayout'
import { getServerProfile } from '@/lib/auth-server'
import SettingsClient from './SettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const profile = await getServerProfile()

  return (
    <AppLayout 
      title="Configuración" 
      subtitle="Instrucciones globales del sistema para el chat"
      showBackButton={true}
      backHref="/admin"
      profile={profile}
    >
      <SettingsClient />
    </AppLayout>
  )
}
