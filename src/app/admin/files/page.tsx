import AppLayout from '@/components/AppLayout'
import { getServerProfile } from '@/lib/auth-server'
import FilesManagementClient from './FilesManagementClient'

export const dynamic = 'force-dynamic'

export default async function FilesManagement() {
  const profile = await getServerProfile()

  return (
    <AppLayout 
      title="Gestión de Archivos" 
      subtitle="Administrar catálogos de precios PDF"
      showBackButton={true}
      backHref="/admin"
      profile={profile}
    >
      <FilesManagementClient />
    </AppLayout>
  )
}