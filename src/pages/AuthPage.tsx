import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ParticleTrail } from '@/components/ParticleTrail'

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (error) setError(error.message)
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)

    if (!businessName.trim()) {
      setError('Enter your business name.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      // Shouldn't happen with email confirmation disabled, but guard anyway.
      setInfo('Check your email to confirm your account, then sign in.')
      setLoading(false)
      setMode('signin')
      return
    }

    // Create the business row right away so BusinessProvider finds it
    // immediately on next load instead of falling back to a default name.
    const { error: bizError } = await supabase
      .from('businesses')
      .insert({ user_id: data.user!.id, name: businessName.trim() })

    setLoading(false)

    if (bizError) {
      setError(`Account created, but business setup failed: ${bizError.message}`)
      return
    }
    // On success, onAuthStateChange in useAuth picks up the session and
    // App.tsx re-renders past this screen automatically.
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden">
      <ParticleTrail />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Quoto" className="h-14 w-14 rounded-full object-cover mb-3" />
          <h1 className="font-heading text-2xl uppercase tracking-widest text-foreground">
            Quoto
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'signin' ? 'Sign in to your workspace' : 'Create your business workspace'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 shadow-2xl shadow-black/40">
          <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
            {error && <p className="text-sm text-rose-400">{error}</p>}
            {info && <p className="text-sm text-emerald-400">{info}</p>}

            {mode === 'signup' && (
              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {mode === 'signin' ? (
              <>
                Don't have a business yet?{' '}
                <button
                  className="text-primary underline"
                  onClick={() => {
                    setMode('signup')
                    setError(null)
                    setInfo(null)
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  className="text-primary underline"
                  onClick={() => {
                    setMode('signin')
                    setError(null)
                    setInfo(null)
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
