'use client'
import Link from 'next/link'
import { useContext, useState, useEffect } from 'react'
import { CartContext } from '../context/CartContext'
import { UserContext } from '../context/UserContext'
import { useRouter, usePathname } from 'next/navigation'
import { useToast } from './ToastProvider'

export default function Navbar(){
  const { cart, clearCart } = useContext(CartContext)
  const { user, setUser, refetch } = useContext(UserContext)
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const linkClass = (path) => {
    const base = 'px-3 py-2 rounded-md text-sm font-medium transition-colors';
    const active = pathname === path ? 'bg-red-100 text-red-700' : 'text-gray-700 hover:bg-gray-50 hover:text-red-600';
    return `${base} ${active}`;
  }

  // close mobile menu on route change (watch pathname)
  useEffect(()=>{ setOpen(false) }, [pathname])

  const logout = async ()=>{
    try{
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await fetch(`${base}/api/auth/logout`, { method: 'POST', credentials: 'include' })
      if (res.ok) {
        toast.success('Logged out')
      } else {
        toast.error('Logout failed')
      }
      // clear client-side state immediately so dashboards update
      try{ setUser(null) }catch(e){}
      try{ clearCart(); localStorage.removeItem('gogol_cart') }catch(e){}
      refetch()
      router.push('/')
    }catch(e){ console.error(e); toast.error('Logout error') }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-bold text-red-600">GoGol Pizza</Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link href="/menu" className={linkClass('/menu')}>Menu</Link>
              {user && user.role === 'seller' && <Link href="/seller" className={linkClass('/seller')}>Seller</Link>}
              {user && user.role === 'client' && (
                <Link href="/checkout" className={linkClass('/checkout')}>Cart ({cart.length})</Link>
              )}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-gray-700 mr-2">Hi, <span className="font-medium">{user.name}</span></span>
                <button onClick={logout} className="bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1 rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-200">Logout</button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-sm px-3 py-2 rounded-md hover:bg-gray-50">Login</Link>
                <Link href="/signup" className="ml-2 text-sm bg-red-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-red-700 transition">Sign up</Link>
              </div>
            )}
          </div>

          {/* mobile menu button */}
          <div className="md:hidden">
            <button onClick={()=>setOpen(s=>!s)} aria-expanded={open} aria-label="Menu" className="p-2 rounded-md text-gray-700 hover:bg-gray-100">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* mobile menu panel */}
      <div className={`md:hidden ${open ? 'block' : 'hidden'} border-t bg-white`}>
        {/* ensure mobile menu is scrollable on small screens and won't exceed viewport height */}
        <div className="px-4 pt-2 pb-4 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <Link href="/menu" className={`block ${pathname === '/menu' ? 'bg-red-50 text-red-700' : 'hover:bg-gray-50' } px-2 py-2 rounded`}>Menu</Link>
          {user && user.role === 'seller' && <Link href="/seller" className={`block ${pathname === '/seller' ? 'bg-red-50 text-red-700' : 'hover:bg-gray-50' } px-2 py-2 rounded`}>Seller</Link>}
          {user && user.role === 'client' && (
            <Link href="/checkout" className={`block ${pathname === '/checkout' ? 'bg-red-50 text-red-700' : 'hover:bg-gray-50' } px-2 py-2 rounded`}>Cart ({cart.length})</Link>
          )}
          {user ? (
            <>
              <div className="px-2 py-2 text-sm">Signed in as {user.name}</div>
              <button onClick={logout} className="w-full text-left px-2 py-2 rounded bg-gray-100 hover:bg-gray-200">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className={`block ${pathname === '/login' ? 'bg-red-50 text-red-700' : 'hover:bg-gray-50'} px-2 py-2 rounded`}>Login</Link>
              <Link href="/signup" className="block px-2 py-2 rounded bg-red-600 text-white text-center hover:bg-red-700">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
