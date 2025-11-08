'use client'
import { useEffect, useState, useContext } from 'react'
import { useToast } from '../../components/ToastProvider'
import { UserContext } from '../../context/UserContext'

export default function AccountPage(){
  const { user, loading } = useContext(UserContext)
  const [orders, setOrders] = useState([])
  const { toast } = useToast()

  const timeGreeting = () => {
    try{
      const hour = new Date().getHours()
      if (hour < 12) return 'Good morning'
      if (hour < 17) return 'Good afternoon'
      return 'Good evening'
    }catch(e){ return 'Hello' }
  }

  useEffect(()=>{
    const fetchOrders = async ()=>{
      try{
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
        const res = await fetch(`${base}/api/orders`, { credentials: 'include' })
        if (!res.ok) {
          if (res.status === 401) {
            toast.error('Please login to view your orders')
            setOrders([])
            return
          }
          toast.error('Failed to load orders')
          setOrders([])
          return
        }
        const data = await res.json()
        // API returns array or { orders: [] }
        if (Array.isArray(data)) setOrders(data)
        else if (data && Array.isArray(data.orders)) setOrders(data.orders)
        else setOrders([])
      }catch(e){ console.error(e); toast.error('Failed to load orders'); setOrders([]) }
    }
    if (!loading) fetchOrders()
  }, [loading])

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">My Account</h1>
  <p className="mt-2 text-sm text-gray-600">{timeGreeting()}, {user && user.name ? user.name : 'Guest'}.</p>

      <div className="mt-4 bg-white p-4 rounded shadow">
        {orders.length === 0 ? (
          <p className="text-sm text-gray-600">No orders found.</p>
        ) : (
          <ul className="space-y-3">
            {orders.map(o => (
              <li key={o._id} className="border p-3 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Order #{o._id}</div>
                    <div className="text-sm text-gray-600">Status: {o.status}</div>
                    <div className="text-sm text-gray-600">Total: KSh {o.total}</div>
                  </div>
                  <div className="text-sm text-gray-500">Placed: {new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="mt-2 text-sm">
                  <div className="font-semibold">Items:</div>
                  <ul className="pl-4 list-disc">
                    {o.items && o.items.map(it => (
                      <li key={it.product}>{it.name} x{it.qty} — KSh {it.price}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
