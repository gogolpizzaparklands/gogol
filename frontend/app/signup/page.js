'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '../../components/ToastProvider'

export default function Signup(){
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  // Role is fixed to 'client' in the UI
  const router = useRouter()
  const { toast } = useToast()

  const submit = async () => {
    setLoading(true)
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
    const res = await fetch(`${base}/api/auth/register`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      // Force role to client on the client side too (server will enforce)
    body: JSON.stringify({ name, email, password, phone, role: 'client' })
    })
    const data = await res.json()
    if (data.user) {
      toast.success('Account created')
      // server set cookie
      router.push('/account')
    } else {
      toast.error(data.msg || 'Signup failed')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center">Sign up</h1>
        <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
          <label className="block text-sm font-medium text-gray-700">Full name</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full p-3 border rounded mt-1 mb-3 focus:outline-none focus:ring-2 focus:ring-red-300" />
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full p-3 border rounded mt-1 mb-3 focus:outline-none focus:ring-2 focus:ring-red-300" />
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone (2547XXXXXXXX)" className="w-full p-3 border rounded mt-1 mb-3 focus:outline-none focus:ring-2 focus:ring-red-300" />
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full p-3 border rounded mt-1 mb-4 focus:outline-none focus:ring-2 focus:ring-red-300" />
          <div className="flex items-center gap-3">
            <button onClick={submit} disabled={loading} className="flex-1 inline-flex justify-center items-center gap-2 bg-red-600 text-white px-4 py-3 rounded shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50">
              {loading ? (<svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle></svg>) : null}
              <span>{loading ? 'Creating...' : 'Create account'}</span>
            </button>
            <button type="button" onClick={() => router.push('/login')} className="inline-flex justify-center items-center px-4 py-3 border rounded text-sm hover:bg-gray-50">Sign in</button>
          </div>
        </div>
      </div>
    </main>
  )
}
