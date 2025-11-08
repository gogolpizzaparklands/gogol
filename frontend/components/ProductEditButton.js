"use client"
import React, { useState } from 'react'
import ProductEditModal from './ProductEditModal'
import { useToast } from './ToastProvider'

export default function ProductEditButton({ product }){
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  return (
    <>
      <button onClick={()=>setOpen(true)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Edit</button>
      <ProductEditModal product={product} open={open} onClose={()=>setOpen(false)} />
    </>
  )
}
