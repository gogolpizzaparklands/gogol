'use client'
import { useEffect, useState, useContext, useRef } from 'react'
import { useToast } from '../../components/ToastProvider'
import ProductEditButton from '../../components/ProductEditButton'
import { UserContext } from '../../context/UserContext'
import { useRouter } from 'next/navigation'

export default function SellerPage(){
  const { user, loading, refetch } = useContext(UserContext)
  const didRefetch = useRef(false)
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [form, setForm] = useState({ name: '', description: '', price: '' })
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const { toast, confirm } = useToast()

  // only fetch seller data once we know the user's auth/role
  const isAuthorized = !!user && (user.role === 'seller' || user.role === 'admin')
  useEffect(()=>{
    if (!loading && !isAuthorized) {
      // redirect unauthorized users to signin
      router.replace('/login')
      return
    }
    if (isAuthorized) {
      fetchProducts();
      fetchOrders();
    }
  }, [user, loading])

  // If the page mounts via client-side navigation and UserContext has not been populated
  // (user is null and loading is false), attempt one refetch to refresh auth state so
  // the redirect/authorization logic above has the latest info.
  useEffect(() => {
    if (!loading && !user && typeof refetch === 'function' && !didRefetch.current) {
      didRefetch.current = true
      refetch().catch(() => {})
    }
  }, [])

  // while we are checking auth show a small placeholder; if unauthorized we'll redirect
  // Render decisions are performed after hooks are registered to avoid hooks-order errors

  useEffect(()=>{
    // listen for product changes triggered by modals/components
    if (!isAuthorized) return
    const handler = (e) => { fetchProducts() }
    window.addEventListener('product:changed', handler)
    return () => window.removeEventListener('product:changed', handler)
  }, [isAuthorized])

  const [analytics, setAnalytics] = useState(null)
  const [clients, setClients] = useState([])
  const [clientsLoading, setClientsLoading] = useState(true)

  useEffect(()=>{ if (isAuthorized) fetchAnalytics() }, [isAuthorized])
  useEffect(()=>{ if (isAuthorized) fetchClients() }, [isAuthorized])

  const fetchAnalytics = async ()=>{
    try{
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await fetch(`${base}/api/seller/analytics`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data)
      }
    }catch(e){ console.error(e) }
  }

  const fetchProducts = async ()=>{
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
    const res = await fetch(`${base}/api/products`)
    const data = await res.json()
    setProducts(data)
  }

  const fetchOrders = async ()=>{
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
    try {
      const res = await fetch(`${base}/api/orders`, { credentials: 'include' })
      if (!res.ok) {
        // if unauthorized or error, clear orders and show a message
        setOrders([])
        if (res.status === 401) {
          toast.error('Not authorized. Please login as seller to view orders.')
        }
        return
      }
      const data = await res.json()
      // backend returns an array of orders; guard in case it's an object
      if (Array.isArray(data)) setOrders(data)
      else if (data && Array.isArray(data.orders)) setOrders(data.orders)
      else setOrders([])
    } catch (e) {
      console.error('fetchOrders error', e)
      setOrders([])
    }
  }

  const fetchClients = async ()=>{
    setClientsLoading(true)
    try{
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await fetch(`${base}/api/seller/clients`, { credentials: 'include' })
      if (!res.ok) {
        setClients([])
        return
      }
      const data = await res.json()
      setClients(Array.isArray(data) ? data : [])
    }catch(e){ console.error('fetchClients error', e); setClients([]) }
    finally{ setClientsLoading(false) }
  }

  const submit = async ()=>{
    setSaving(true)
    // optimistic UI: create a temporary product entry with local previews
    const tempId = `temp-${Date.now()}`
    let tempImages = []
    // client-side validation
  if (!form.name || String(form.name).trim() === '') { toast.error('Product name is required'); setSaving(false); return }
  if (!form.price && form.price !== 0) { toast.error('Product price is required'); setSaving(false); return }

    try {
      tempImages = files.map(f => ({ url: URL.createObjectURL(f), public_id: `local-${Math.random().toString(36).slice(2)}` }))
      const tempProduct = { _id: tempId, name: form.name, price: form.price, images: tempImages, coverImage: tempImages[0], _temp: true }
      setProducts(prev => [tempProduct, ...prev])

      // Use XHR to get upload progress
      await new Promise((resolve, reject) => {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
        const xhr = new XMLHttpRequest()
        const fd = new FormData()
        fd.append('name', form.name)
        fd.append('description', form.description)
        fd.append('price', form.price)
        fd.append('category', 'Pizza')
        for (const f of files) fd.append('images', f)
  xhr.open('POST', `${base}/api/products`)
  // ask for JSON response so we can safely read xhr.response
  try { xhr.responseType = 'json' } catch (e) { /* older browsers may throw */ }
        xhr.withCredentials = true
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100)
            // set a simple progress indicator on the temp product (could be used to show progress)
            setProducts(prev => prev.map(p => p._id === tempId ? { ...p, _progress: percent } : p))
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = xhr.response && Object.keys(xhr.response).length ? xhr.response : (() => {
              try { return JSON.parse(xhr.responseText) } catch(e){ return null }
            })()
            if (data) {
              // replace temp product with real data
              setProducts(prev => prev.map(p => p._id === tempId ? data : p))
              try{ window.dispatchEvent(new CustomEvent('product:changed', { detail: { id: data._id } })) }catch(e){}
              resolve()
            } else {
              // couldn't parse response — refresh list to pick up created product
              setTimeout(()=>fetchProducts(), 200)
              resolve()
            }
          } else {
            // remove temp product on error
            setProducts(prev => prev.filter(p => p._id !== tempId))
            reject(new Error('Upload failed'))
          }
        }
        xhr.onerror = () => { setProducts(prev => prev.filter(p => p._id !== tempId)); reject(new Error('Network error')) }
        xhr.send(fd)
      })

      setForm({ name:'', description:'', price:'' })
      setFiles([])
      toast.success('Product created')
    } catch(err){
      console.error(err)
      toast.error('Failed to create product')
    } finally { setSaving(false) }
  }

  const deleteProduct = async (id) => {
    const ok = await confirm('Delete this product?')
    if (!ok) return
    try{
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await fetch(`${base}/api/products/${id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) setProducts(prev => prev.filter(p => p._id !== id))
      toast.success('Product deleted')
    }catch(e){ console.error(e) }
  }

  const updateOrderStatus = async (orderId, status)=>{
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
    await fetch(`${base}/api/orders/${orderId}/status`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    fetchOrders()
    toast.success('Order status updated')
  }

  const deleteOrder = async (orderId) => {
    const ok = await confirm('Delete this order? This cannot be undone.')
    if (!ok) return
    try{
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await fetch(`${base}/api/orders/${orderId}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        setOrders(prev => prev.filter(o => o._id !== orderId))
        toast.success('Order deleted')
      } else {
        const data = await res.json().catch(()=>({}));
        toast.error(data.msg || 'Failed to delete order')
      }
    }catch(e){ console.error('deleteOrder error', e); toast.error('Failed to delete order') }
  }

  if (loading) return (<main className="container mx-auto p-4">Checking authentication…</main>)
  if (!loading && !isAuthorized) return null

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Seller Dashboard</h1>

      <section className="mt-6 bg-white p-4 rounded shadow">
        <h2 className="font-semibold">Add Product</h2>
        <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name" className="w-full p-2 border rounded mb-2" />
        <input value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="Price" className="w-full p-2 border rounded mb-2" />
        <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description" className="w-full p-2 border rounded mb-2" />
  <input type="file" multiple onChange={e=>setFiles(Array.from(e.target.files))} />
  <button onClick={submit} disabled={saving} className="mt-2 bg-green-600 text-white px-4 py-2 rounded">Create Product</button>
      </section>

      <section className="mt-6">
        <h2 className="text-xl">Your Products</h2>
        {analytics && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <div className="text-sm text-gray-500">Total sales</div>
              <div className="text-2xl font-bold">KSh {analytics.totalSales.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <div className="text-sm text-gray-500">Orders (all time)</div>
              <div className="text-2xl font-bold">{analytics.ordersCount}</div>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <div className="text-sm text-gray-500">Top product</div>
              <div className="text-lg font-semibold">{analytics.topProducts && analytics.topProducts[0] ? analytics.topProducts[0].name : '—'}</div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {products.map(p=> (
            <div key={p._id} className="bg-white p-3 rounded shadow">
              <div className="w-full h-32 bg-gray-100 rounded overflow-hidden">
                  {/* show selected cover image if available, otherwise first image or placeholder */}
                  { (p.coverImage && p.coverImage.url) || (p.images && p.images.length) ? (
                    <img src={(p.coverImage && p.coverImage.url) || (p.images && p.images[0].url)} className="w-full h-32 object-cover rounded" />
                  ) : (
                    <img src={'/placeholder.png'} className="w-full h-32 object-cover rounded" />
                  )}
                  {/* thumbnails row for quick image actions */}
                  {p.images && p.images.length ? (
                    <div className="flex gap-2 overflow-x-auto p-2 mt-2">
                      {p.images.map(img => (
                        <div key={img.public_id || img.url} className="relative">
                          <img src={img.url} className="h-16 w-16 object-cover rounded" />
                          <div className="absolute top-0 right-0 flex gap-1">
                            <button onClick={async()=>{
                              if (!(await confirm('Set this image as cover for the product?'))) return;
                              try{
                                const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
                                const res = await fetch(`${base}/api/products/${p._id}/cover`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ public_id: img.public_id }) })
                                if (res.ok){
                                  const data = await res.json()
                                  setProducts(prev => prev.map(prod => prod._id === p._id ? { ...prod, images: data.images, coverImage: data.coverImage } : prod))
                                  toast.success('Cover image updated')
                                } else {
                                  toast.error('Failed to set cover image')
                                }
                              }catch(e){ console.error(e); toast.error('Failed to set cover image') }
                            }} className="bg-blue-600 text-white text-xs px-1 rounded">★</button>
                            <button onClick={async()=>{
                              if (!(await confirm('Delete this image?'))) return;
                              try{
                                if (!p.images || p.images.length <= 1) { toast.error('A product must have at least one image.'); return; }
                                const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
                                const res = await fetch(`${base}/api/products/${p._id}/images`, { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ public_id: img.public_id }) })
                                if (res.ok){
                                  const data = await res.json()
                                  setProducts(prev => prev.map(prod => prod._id === p._id ? { ...prod, images: data.images, coverImage: data.coverImage } : prod))
                                  toast.success('Image deleted')
                                } else {
                                  const err = await res.json().catch(()=>({}));
                                  toast.error(err.msg || 'Failed to delete image')
                                }
                              }catch(e){ console.error(e); toast.error('Failed to delete image') }
                            }} className="bg-red-600 text-white text-xs px-1 rounded">x</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
              </div>
              <h3 className="font-semibold mt-2">{p.name}</h3>
              <p>KSh {p.price}</p>
              <div className="mt-2 flex gap-2">
                <ProductEditButton product={p} />
                <button onClick={()=>deleteProduct(p._id)} className="bg-red-600 text-white px-3 py-1 rounded">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xl">Orders</h2>
        <div className="mt-2">
          {orders.map(o=> (
            <div key={o._id} className="bg-white p-3 rounded shadow mb-2">
              <div className="flex justify-between">
                <div>
                  <div className="text-sm text-gray-600">Order: {o._id}</div>
                  <div className="font-semibold">KSh {o.total}</div>
                  {/* Client details (populated on backend) */}
                  {o.user ? (
                    <div className="text-sm text-gray-700 mt-1">
                      <div><strong>Client:</strong> {o.user.name || o.user.email}</div>
                      <div className="text-xs text-gray-500">{o.user.email} {o.user.phone ? (<><span className="mx-1">·</span><a href={`tel:${o.user.phone}`} className="text-blue-600 hover:underline">{o.user.phone}</a></>) : ''}</div>
                    </div>
                  ) : null}
                </div>
                <div>
                  <select value={o.status} onChange={(e)=>updateOrderStatus(o._id, e.target.value)} className="p-2 border rounded">
                    <option>Order Received</option>
                    <option>Preparing</option>
                    <option>Out for Delivery</option>
                    <option>Delivered</option>
                  </select>
                  <button onClick={()=>deleteOrder(o._id)} className="ml-2 inline-block bg-red-600 text-white px-3 py-1 rounded">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-6">
        <h2 className="text-xl">Registered Clients</h2>
        <div className="mt-2 bg-white p-4 rounded shadow">
          {clientsLoading ? (
            <div>Loading clients…</div>
          ) : clients.length === 0 ? (
            <div>No registered clients found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="p-2">Name</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Phone</th>
                    <th className="p-2">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c._id} className="border-t">
                      <td className="p-2">{c.name || '—'}</td>
                      <td className="p-2">{c.email}</td>
                      <td className="p-2">{c.phone ? (<a href={`tel:${c.phone}`} className="text-blue-600 hover:underline">{c.phone}</a>) : '—'}</td>
                      <td className="p-2">{new Date(c.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      <section className="mt-6">
        <h2 className="text-xl">Revenue (last 30 days)</h2>
        <div className="mt-2 bg-white p-4 rounded shadow">
          {analytics ? (
            <div>
              <div className="text-sm text-gray-600">Daily revenue (last 30 days)</div>
              <div className="mt-2 grid grid-cols-3 md:grid-cols-6 gap-2 items-end">
                {analytics.revenueByDay.map((d, idx)=> (
                  <div key={d.date} className="flex flex-col items-center">
                    <div style={{height: Math.min(120, Math.round(d.revenue/100))}} className="w-6 bg-green-500 rounded-t" title={`${d.date}: KSh ${d.revenue}`} />
                    <div className="text-xs mt-1">{d.date.slice(5)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : <div>Loading analytics…</div>}
        </div>
      </section>
    </main>
  )
}
