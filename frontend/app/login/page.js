"use client"
import { useState, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '../../components/ToastProvider'
import { UserContext } from '../../context/UserContext'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [expectingSellerVerification, setExpectingSellerVerification] = useState(false)
  const [sellerEmail, setSellerEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { refetch } = useContext(UserContext)

  const submit = async () => {
    setLoading(true)
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await fetch(`${base}/api/auth/login`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (data.sellerRequiresVerification) {
        setExpectingSellerVerification(true)
        setSellerEmail(email)
        // If server returned a dev code (when email sending failed in dev), prefill it so developer can continue
        if (data.code) {
          setVerificationCode(data.code)
          toast.info(`Dev verification code: ${data.code}`)
        } else {
          toast.info('Verification code sent to seller email')
        }
        return
      }
      if (data.user) {
        toast.success('Logged in')
        // login successful; cookie set by server. Update client-side user and redirect by role.
        try{ if (typeof refetch === 'function') await refetch() }catch(e){}
        if (data.user && data.user.role === 'seller') router.push('/seller')
        else router.push('/account')
      } else {
        setError(data.msg || 'Login failed')
        toast.error(data.msg || 'Login failed')
      }
    } catch (err) { setError('Login failed') }
    finally{ setLoading(false) }
  }

  const submitSellerCode = async () => {
    setLoading(true)
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await fetch(`${base}/api/auth/seller/verify`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sellerEmail, code: verificationCode })
      })
      const data = await res.json()
      if (data.user) {
        toast.success('Seller signed in')
        router.push('/seller')
      } else {
        setError(data.msg || 'Verification failed')
        toast.error(data.msg || 'Verification failed')
      }
    } catch (err) { setError('Verification failed') }
    finally{ setLoading(false) }
  }

  const submitForgot = async () => {
    if (!forgotEmail || !forgotEmail.includes('@')) { toast.error('Please enter a valid email'); return }
    setForgotLoading(true)
    try{
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await fetch(`${base}/api/auth/forgot`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: forgotEmail }), credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.msg || 'Check your email for instructions')
        // in dev we may receive temp in response; show it politely
        if (data.temp) toast.info(`Temporary password (dev): ${data.temp}`)
        setForgotOpen(false)
      } else {
        toast.error(data.msg || 'Failed to send')
      }
    }catch(e){ console.error(e); toast.error('Failed to send') }
    finally{ setForgotLoading(false) }
  }

  return (
    <>
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center">Login</h1>
        <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full p-3 border rounded mt-1 mb-3 focus:outline-none focus:ring-2 focus:ring-red-300" />
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full p-3 border rounded mt-1 mb-4 focus:outline-none focus:ring-2 focus:ring-red-300" />
          {!expectingSellerVerification ? (
            <>
            <div className="flex items-center gap-3">
              <button onClick={submit} disabled={loading} aria-busy={loading} className="flex-1 inline-flex justify-center items-center gap-2 bg-red-600 text-white px-4 py-3 rounded shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50">
                {loading ? (<svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle></svg>) : null}
                <span>{loading ? 'Logging in...' : 'Login'}</span>
              </button>
              <button type="button" onClick={() => router.push('/signup')} className="inline-flex justify-center items-center px-4 py-3 border rounded text-sm hover:bg-gray-50">Sign up</button>
            </div>
            <div className="mt-3 text-center">
              <button type="button" onClick={()=>setForgotOpen(true)} className="text-sm text-gray-600 hover:underline">Forgot password?</button>
            </div>
            </>
          ) : (
            <>
              <p className="mb-2">Enter the 6-digit code sent to your seller email</p>
              <input value={verificationCode} onChange={e=>setVerificationCode(e.target.value)} placeholder="6-digit code" className="w-full p-3 border rounded mb-3 focus:outline-none focus:ring-2 focus:ring-red-300" />
              <div className="flex items-center gap-3">
                <button onClick={submitSellerCode} disabled={loading} aria-busy={loading} className="flex-1 inline-flex justify-center items-center gap-2 bg-red-600 text-white px-4 py-3 rounded shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50">{loading ? 'Verifying...' : 'Verify & Sign in'}</button>
                <button type="button" onClick={() => router.push('/signup')} className="text-sm text-gray-600 underline">Don't have an account? Sign up</button>
              </div>
            </>
          )}
          {error && <p className="text-red-600 mt-3" role="alert">{error}</p>}
        </div>
      </div>
    </main>
    <ForgotModal open={forgotOpen} onClose={()=>setForgotOpen(false)} email={forgotEmail} setEmail={setForgotEmail} loading={forgotLoading} onSubmit={submitForgot} />
    </>
  )
}

// Forgot password modal (rendered from login page state)
function ForgotModal({ open, onClose, email, setEmail, loading, onSubmit }){
  if (!open) return null
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded shadow max-w-md w-full p-6">
        <h3 className="text-lg font-semibold">Forgot password</h3>
        <p className="text-sm text-gray-600 mt-2">Enter the email associated with your account and we'll email you a temporary password.</p>
        <div className="mt-4">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-red-300" />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={onSubmit} disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50">{loading ? 'Sending...' : 'Send'}</button>
        </div>
      </div>
    </div>
  )
}
