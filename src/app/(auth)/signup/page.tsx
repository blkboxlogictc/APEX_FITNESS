'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Zap, Loader2, CheckCircle } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  const passwordStrength = (() => {
    if (password.length === 0) return 0
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  })()

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength]
  const strengthColor = ['', '#FF6B35', '#FF6B35', '#00D4AA', '#00D4AA'][passwordStrength]

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    if (data.session) {
      router.push('/onboarding')
      router.refresh()
    } else {
      setEmailSent(true)
    }

    setIsLoading(false)
  }

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setIsGoogleLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="w-full text-center">
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
            <Zap size={22} className="text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-bold font-space-grotesk gradient-text tracking-tight">APEX</h1>
        </div>
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-8">
          <div className="w-14 h-14 rounded-full bg-[#00D4AA]/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-[#00D4AA]" />
          </div>
          <h2 className="text-xl font-semibold font-space-grotesk text-[#F0F0FF] mb-2">Check your email</h2>
          <p className="text-[#6B7280] text-sm leading-relaxed">
            We sent a confirmation link to <span className="text-[#F0F0FF]">{email}</span>. Click the link to activate your account and start your journey.
          </p>
        </div>
        <p className="text-center text-[#6B7280] text-sm mt-6">
          Already confirmed?{' '}
          <Link href="/login" className="text-[#6C63FF] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
            <Zap size={22} className="text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-bold font-space-grotesk gradient-text tracking-tight">APEX</h1>
        </div>
        <p className="text-[#6B7280] text-sm">Start your transformation today</p>
      </div>

      {/* Card */}
      <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-6">
        <h2 className="text-xl font-semibold font-space-grotesk text-[#F0F0FF] mb-6">Create your account</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3.5 text-[#F0F0FF] text-sm focus:outline-none focus:border-[#6C63FF] transition-colors duration-200 placeholder-[#6B7280]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3.5 pr-11 text-[#F0F0FF] text-sm focus:outline-none focus:border-[#6C63FF] transition-colors duration-200 placeholder-[#6B7280]"
                placeholder="Min. 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#F0F0FF] transition-colors duration-200"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex-1 h-1 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: i <= passwordStrength ? strengthColor : '#1E1E2E',
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs" style={{ color: strengthColor }}>
                  {strengthLabel}
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 transition-all duration-200 hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-[#1E1E2E]" />
          <span className="text-[#6B7280] text-xs">or</span>
          <div className="flex-1 h-px bg-[#1E1E2E]" />
        </div>

        <button
          onClick={handleGoogleSignup}
          disabled={isLoading || isGoogleLoading}
          className="w-full py-3 rounded-xl bg-[#0A0A0F] border border-[#1E1E2E] text-[#F0F0FF] text-sm font-medium flex items-center justify-center gap-3 hover:border-[#6C63FF]/50 transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
        >
          {isGoogleLoading ? (
            <Loader2 size={17} className="animate-spin text-[#6B7280]" />
          ) : (
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
              <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4" />
              <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" fill="#34A853" />
              <path d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" fill="#FBBC05" />
              <path d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" fill="#EA4335" />
            </svg>
          )}
          Continue with Google
        </button>

        <p className="text-[#6B7280] text-xs text-center mt-4 leading-relaxed">
          By signing up you agree to our{' '}
          <span className="text-[#6C63FF]">Terms of Service</span> and{' '}
          <span className="text-[#6C63FF]">Privacy Policy</span>
        </p>
      </div>

      <p className="text-center text-[#6B7280] text-sm mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-[#6C63FF] hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  )
}
