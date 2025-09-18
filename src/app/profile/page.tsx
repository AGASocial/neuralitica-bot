import AppLayout from '@/components/AppLayout'
import { getServerProfile } from '@/lib/auth-server'
import ProfilePageClient from './ProfilePageClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const profile = await getServerProfile()

  return (
    <AppLayout 
      title="Mi Perfil" 
      subtitle="Gestiona tu información personal"
      profile={profile}
    >
      <ProfilePageClient />
    </AppLayout>
  )
}