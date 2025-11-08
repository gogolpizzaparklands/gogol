'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import io from 'socket.io-client'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'
import { useToast } from '../../../../components/ToastProvider'

const L = typeof window !== 'undefined' ? require('leaflet') : null

export default function TrackPage(){
  const params = useParams()
  const id = params.id
  const [order, setOrder] = useState(null)
  const [socket, setSocket] = useState(null)
  const [map, setMap] = useState(null)
  const [marker, setMarker] = useState(null)
  const { toast } = useToast()

  useEffect(()=>{
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
    const fetchOrder = async ()=>{
      const res = await fetch(`${base}/api/orders/${id}`)
      const data = await res.json()
      setOrder(data)
    }
    fetchOrder()
  },[id])

  useEffect(()=>{
    if (!id) return;
    const s = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', { transports: ['websocket'], withCredentials: true })
    setSocket(s)
    s.emit('joinOrder', id)
    s.on('orderUpdated', (payload)=>{
      if (payload.orderId === id) {
        setOrder(prev => ({ ...prev, status: payload.status }))
        toast.info(`Order status: ${payload.status}`)
      }
    })
    s.on('mpesaStatus', (payload)=>{
      if (payload.orderId === id) {
        if (payload.success) toast.success('Payment confirmed')
        else toast.error('Payment failed')
      }
    })
    return ()=>{ s.emit('leaveOrder', id); s.disconnect(); }
  },[id])

  useEffect(()=>{
    if (!order || typeof window === 'undefined') return
    if (!order.deliveryLocation || !order.deliveryLocation.lat) return
    // initialize map
    if (!map) {
      const mapInstance = L.map('map').setView([order.deliveryLocation.lat, order.deliveryLocation.lng], 14)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(mapInstance)
      const m = L.marker([order.deliveryLocation.lat, order.deliveryLocation.lng]).addTo(mapInstance)
      setMap(mapInstance)
      setMarker(m)
    } else {
      marker && marker.setLatLng([order.deliveryLocation.lat, order.deliveryLocation.lng])
      map && map.setView([order.deliveryLocation.lat, order.deliveryLocation.lng])
    }
  },[order])

  if (!order) return <main className="container mx-auto p-4">Loading...</main>

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Track Order</h1>
      <div className="mt-4 bg-white p-4 rounded shadow">
        <div>Order: {order._id}</div>
        <div>Status: <strong>{order.status}</strong></div>
        {order.user && (
          <div className="mt-2 text-sm">
            <div><strong>Client:</strong> {order.user.name || order.user.email}</div>
            <div className="text-xs text-gray-600">
              {order.user.email} {order.user.phone ? (<><span className="mx-1">·</span><a href={`tel:${order.user.phone}`} className="text-blue-600 hover:underline">{order.user.phone}</a></>) : null}
            </div>
          </div>
        )}
        <div className="mt-4 h-80" id="map"></div>
      </div>
    </main>
  )
}
