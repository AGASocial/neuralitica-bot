import AppLayout from '@/components/AppLayout'
import { getServerProfile } from '@/lib/auth-server'
import AdminDashboardClient from './AdminDashboardClient'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const profile = await getServerProfile()

  return (
    <AppLayout 
      title="Panel de Control" 
      subtitle="Dashboard administrativo NeuraliticaBot"
      profile={profile}
    >
      <AdminDashboardClient />
    </AppLayout>
  )
}