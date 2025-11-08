"use client"
import React, { useContext, useState } from 'react'
import { useToast } from './ToastProvider'
import { UserContext } from '../context/UserContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProductDetailsModal({ product, open, onClose, onAdd }){
  const { toast } = useToast()
  const { user } = useContext(UserContext)
  const router = useRouter()
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(false)
  const [localProduct, setLocalProduct] = useState(product)

  // keep a local copy so modal can update immediately after mutations
  useEffect(()=> setLocalProduct(product), [product])
  const images = (localProduct?.images || product.images || []).slice(0,5)
  const isSellerOwner = user && user.role === 'seller' && product && product.seller && String(product.seller) === String(user._id)
  useEffect(()=>{
    // ensure qty resets when modal opens
    setQty(1)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
      {/* On small screens allow modal to use most of viewport and scroll internally */}
      <div className="bg-white rounded shadow w-full max-w-2xl sm:max-w-lg md:max-w-2xl p-4 max-h-[90vh] overflow-y-auto mx-4">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-semibold">{product.name}</h2>
          <button onClick={onClose} className="text-gray-600">✕</button>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            {images.length ? (
              <div className="space-y-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img src={img.url} alt={`${product.name} ${idx+1}`} className="w-full h-32 object-cover rounded" />
                    {isSellerOwner && (
                      <div className="absolute top-1 right-1 flex gap-1">
                        <button onClick={async()=>{
                          if (!confirm('Set this image as cover?')) return
                          try{
                            const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
                            const res = await fetch(`${base}/api/products/${product._id}/cover`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ public_id: img.public_id }) })
                            if (res.ok){
                              const data = await res.json()
                              // update local view immediately (merge fields so we keep name/price/etc)
                              if (data && (data.coverImage || data.images)) {
                                setLocalProduct(prev => ({ ...prev, images: data.images || prev.images, coverImage: data.coverImage || prev.coverImage }))
                              }
                              try{ window.dispatchEvent(new CustomEvent('product:changed', { detail: { id: product._id } })) }catch(e){}
                              toast.success('Cover updated')
                            } else { const err = await res.json().catch(()=>({})); console.error('set cover failed', res.status, err); toast.error(err.msg || 'Failed to set cover') }
                          }catch(e){ console.error(e); toast.error('Failed to set cover') }
                        }} className="bg-blue-600 text-white text-xs px-1 rounded">★</button>
                        <button onClick={async()=>{
                          if (!confirm('Delete this image?')) return
                          try{
                            const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
                            const res = await fetch(`${base}/api/products/${product._id}/images`, { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ public_id: img.public_id }) })
                            if (res.ok){
                              const data = await res.json()
                              if (data && data.images) setLocalProduct(prev => ({ ...prev, images: data.images, coverImage: data.coverImage }))
                              try{ window.dispatchEvent(new CustomEvent('product:changed', { detail: { id: product._id } })) }catch(e){}
                              toast.success('Image deleted')
                            } else { const err = await res.json().catch(()=>({})); console.error('delete image failed', res.status, err); toast.error(err.msg || 'Failed to delete') }
                          }catch(e){ console.error(e); toast.error('Failed to delete') }
                        }} className="bg-red-600 text-white text-xs px-1 rounded">x</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full h-32 bg-gray-100 rounded" />
            )}
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-700">{product.description || 'No description provided.'}</p>
            <p className="mt-4 font-semibold">KSh {product.price}</p>
            <div className="mt-4 flex items-center gap-3">
              {!isSellerOwner && (
                <>
                  <input aria-label="quantity" type="number" min={1} value={qty} onChange={e=>setQty(Math.max(1, Number(e.target.value || 1)))} className="w-20 p-1 border rounded" />
                  <button disabled={loading} onClick={() => {
                    if (!user) { toast.info('Please sign in to add items to cart'); router.push('/login'); return }
                    setLoading(true)
                    try{ onAdd(qty); toast.success(`${product.name} added to cart`); onClose(); }finally{ setLoading(false) }
                  }} className="bg-red-600 text-white px-3 py-2 rounded">{loading ? 'Adding...' : 'Add to cart'}</button>
                </>
              )}
              <button onClick={onClose} className="px-3 py-2 border rounded">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
