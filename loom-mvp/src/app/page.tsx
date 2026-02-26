'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AuthForm from '@/components/AuthForm'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

function LandingContent() {
  const [user, setUser] = useState<User | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup')
  const searchParams = useSearchParams()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    // Open login modal if redirected from protected route
    if (searchParams.get('login') === 'true') {
      setAuthMode('login')
      setShowAuth(true)
    }

    return () => subscription.unsubscribe()
  }, [searchParams])

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 px-4">
      {/* Hero */}
      <div className="space-y-4 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-2 text-blue-400 text-sm font-medium mb-4">
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          Free screen recording
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
          Record and share{' '}
          <span className="text-blue-500">instantly</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Screen recordings made simple. Record, upload, share — in seconds.
          No downloads required.
        </p>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        {user ? (
          <Link
            href="/record"
            className="rounded-xl bg-blue-600 hover:bg-blue-500 px-8 py-4 text-lg font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
          >
            Start Recording
          </Link>
        ) : (
          <>
            <button
              onClick={() => {
                setAuthMode('signup')
                setShowAuth(true)
              }}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-8 py-4 text-lg font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
            >
              Start Recording — It&apos;s Free
            </button>
            <button
              onClick={() => {
                setAuthMode('login')
                setShowAuth(true)
              }}
              className="rounded-xl border border-gray-700 hover:border-gray-500 px-8 py-4 text-lg font-medium text-gray-300 hover:text-white transition-all duration-200"
            >
              Log In
            </button>
          </>
        )}
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full mt-16 pt-8 border-t border-gray-800">
        {[
          {
            icon: (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
              </svg>
            ),
            title: 'Screen & Webcam',
            desc: 'Record your screen, webcam, or both simultaneously',
          },
          {
            icon: (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            ),
            title: 'Instant Upload',
            desc: 'Videos uploaded directly to cloud storage',
          },
          {
            icon: (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            ),
            title: 'Easy Sharing',
            desc: 'Share with a link — no account needed to watch',
          },
        ].map((f) => (
          <div key={f.title} className="p-6 rounded-xl bg-gray-900 border border-gray-800 text-left">
            <div className="text-blue-400 mb-3">{f.icon}</div>
            <h3 className="font-semibold text-white mb-1">{f.title}</h3>
            <p className="text-gray-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </div>

      {showAuth && (
        <AuthForm onClose={() => setShowAuth(false)} defaultMode={authMode} />
      )}
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[70vh]"><div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <LandingContent />
    </Suspense>
  )
}
