'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AuthForm from '@/components/AuthForm'
import toast from 'react-hot-toast'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Logged out')
    router.push('/')
    router.refresh()
  }

  function openLogin() {
    setAuthMode('login')
    setShowAuth(true)
  }

  function openSignup() {
    setAuthMode('signup')
    setShowAuth(true)
  }

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-bold text-white hover:text-blue-400 transition-colors">
            LoomMVP
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/record"
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200"
                >
                  New Recording
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-gray-700 hover:border-gray-500 px-4 py-2 text-sm text-gray-300 hover:text-white transition-all duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={openLogin}
                  className="text-sm text-gray-300 hover:text-white transition-colors px-4 py-2"
                >
                  Login
                </button>
                <button
                  onClick={openSignup}
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {showAuth && (
        <AuthForm onClose={() => setShowAuth(false)} defaultMode={authMode} />
      )}
    </>
  )
}
