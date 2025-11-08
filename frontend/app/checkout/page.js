'use client'
import { useContext, useState } from 'react'
import { CartContext } from '../../context/CartContext'
import { useToast } from '../../components/ToastProvider'

export default function Checkout(){
  const { cart, total, clearCart, removeFromCart, updateQty } = useContext(CartContext)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const { toast } = useToast()

  const createOrder = async () => {
    setLoading(true)
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      // Create order on backend
      const orderRes = await fetch(`${base}/api/orders`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, total, deliveryLocation: {} })
      })
      const order = await orderRes.json()
      // Initiate STK Push
      const payRes = await fetch(`${base}/api/payments/order/${order._id}/stkpush`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })
      const payData = await payRes.json()
      toast.success('Payment initiated. Check your phone for the STK push.')
      clearCart()
    } catch (err) {
      console.error(err)
      toast.error('Payment failed to initiate.')
    } finally { setLoading(false) }
  }

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <div className="mt-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold">Your items</h2>
          {cart.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">Your cart is empty.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {cart.map(item => (
                <li key={item.product} className="flex items-center justify-between border p-2 rounded">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">KSh {item.price}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded">
                      <button onClick={()=>{ updateQty(item.product, (item.qty||0) - 1); }} className="px-2">−</button>
                      <div className="px-3">{item.qty}</div>
                      <button onClick={()=>{ updateQty(item.product, (item.qty||0) + 1); }} className="px-2">+</button>
                    </div>
                    <button onClick={()=>{ removeFromCart(item.product); toast.success(`${item.name} removed from cart`) }} className="text-sm px-2 py-1 border rounded">Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4">Total: KSh {total}</p>
          <label className="block mt-4">Phone (2547XXXXXXXX):</label>
          <input value={phone} onChange={e=>setPhone(e.target.value)} className="border p-2 rounded w-full" />
          <button disabled={loading} onClick={createOrder} className="mt-4 bg-red-600 text-white px-4 py-2 rounded">Pay with Mpesa</button>
          {message && <p className={`mt-4 ${message.type==='error'?'text-red-600':'text-green-600'}`}>{message.text}</p>}
        </div>
      </div>
    </main>
  )
}
