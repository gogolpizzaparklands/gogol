"use client"
import React, { useEffect, useState } from 'react'
import { useToast } from './ToastProvider'

export default function ProductEditModal({ product, open, onClose }){
  const { toast } = useToast()
  const [name, setName] = useState(product?.name || '')
  const [price, setPrice] = useState(product?.price || '')
  const [description, setDescription] = useState(product?.description || '')
  const [loading, setLoading] = useState(false)
  

  useEffect(()=>{
    if (open) {
      setName(product?.name || '')
      setPrice(product?.price || '')
      setDescription(product?.description || '')
    }
  }, [open, product])

  if (!open) return null

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try{
      // client-side validation
      if (!name || String(name).trim() === ''){ toast.error('Name is required'); setLoading(false); return }
      if ((price === undefined || price === null || String(price).trim() === '')){ toast.error('Price is required'); setLoading(false); return }
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      let res
      // send JSON with updated fields (images handled elsewhere / disabled in this modal)
      res = await fetch(`${base}/api/products/${product._id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, price, description }) })
      if (res.ok){
        toast.success('Product updated')
        // notify other parts of the app
        try{ window.dispatchEvent(new CustomEvent('product:changed', { detail: { id: product._id } })) }catch(e){}
        onClose()
      } else {
        const err = await res.json().catch(()=>({})); toast.error(err.msg || 'Failed to update product')
      }
    }catch(e){ console.error(e); toast.error('Failed to update product') }
    finally{ setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
      {/* modal uses max-height and internal scroll on small screens */}
      <form onSubmit={submit} className="bg-white rounded shadow w-full max-w-xl sm:mx-4 mx-2 p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit Product</h3>
          <button type="button" onClick={onClose} className="text-gray-600">✕</button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2">
          <input value={name} onChange={e=>setName(e.target.value)} className="p-2 border rounded" placeholder="Name" />
          <input value={price} onChange={e=>setPrice(e.target.value)} className="p-2 border rounded" placeholder="Price" />
          <textarea value={description} onChange={e=>setDescription(e.target.value)} className="p-2 border rounded" placeholder="Description" />
          {/* image upload removed from edit modal - manage images from product page instead */}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
          <button type="submit" disabled={loading} className="px-3 py-2 bg-blue-600 text-white rounded">{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  )
}
