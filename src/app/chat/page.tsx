import AppLayout from '@/components/AppLayout'
import { getServerProfile } from '@/lib/auth-server'
import ChatPageClient from './ChatPageClient'

export const dynamic = 'force-dynamic'

export default async function ChatPage() {
  const profile = await getServerProfile()

  return (
    <AppLayout 
      title="Consulta de Precios NeuraliticaBot" 
      subtitle="Consultas de precios B2B ultra-rápidas para el mercado venezolano"
      profile={profile}
      showBackButton={profile?.role === 'ADMIN'}
    >
      <ChatPageClient />
    </AppLayout>
  )
}