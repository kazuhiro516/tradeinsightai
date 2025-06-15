import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Dashboard from '@/app/components/Dashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // 未ログインの場合はLPにリダイレクト
  if (!session) {
    redirect('/')
  }

  return <Dashboard />
}
