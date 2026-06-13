'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'

export function useSupabaseAuth() {
  const { data: session } = useSession()
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getSupabaseUser() {
      if (!session?.user?.email) {
        setLoading(false)
        return
      }

      try {
        // Get Supabase user by email
        const { data: { users }, error } = await supabase.auth.admin.listUsers()

        if (error) {
          console.error('Error listing Supabase users:', error)
          setLoading(false)
          return
        }

        // Find user by email or telegram ID
        const user = users.find(u => {
          if (session.user?.email) {
            return u.email === session.user.email
          }
          return false
        })

        if (user) {
          setSupabaseUserId(user.id)
        }
      } catch (err) {
        console.error('Error getting Supabase user:', err)
      }

      setLoading(false)
    }

    getSupabaseUser()
  }, [session])

  return { supabaseUserId, loading }
}
