'use client'
import Image from 'next/image'
import { useContext, useState } from 'react'
import { CartContext } from '../context/CartContext'
import { UserContext } from '../context/UserContext'
import { useRouter } from 'next/navigation'
import { useToast } from './ToastProvider'
import ProductDetailsModal from './ProductDetailsModal'
import ProductEditButton from './ProductEditButton'

export default function ProductCard({ product }){
  const { addToCart } = useContext(CartContext)
  const { toast } = useToast()
  const { user } = useContext(UserContext)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [qty, setQty] = useState(1)

  const isSellerOwner = user && user.role === 'seller' && product && product.seller && String(product.seller) === String(user._id)

  const handleAdd = async () => {
    if (!user) {
      toast.info('Please sign in to add items to your cart')
      return router.push('/login')
    }
    try{
      setLoading(true)
      // addToCart is synchronous (updates local state/localStorage)
      addToCart(product, qty)
      toast.success(`${product.name} added to cart`)
    }catch(e){
      console.error('Add to cart error', e)
      toast.error('Failed to add to cart')
    }finally{
      // small delay so spinner is visible briefly
      setTimeout(()=> setLoading(false), 250)
    }
  }

  return (
    <div className="bg-white p-4 rounded shadow flex flex-col">
      {((product.coverImage && product.coverImage.url) || (product.images && product.images[0])) ? (
        <img src={(product.coverImage && product.coverImage.url) || (product.images && product.images[0].url)} alt={product.name} className="w-full h-40 sm:h-48 md:h-56 object-cover rounded" />
      ) : (
        <div className="w-full h-40 sm:h-48 md:h-56 bg-gray-200 rounded" />
      )}
      <h3 className="mt-2 font-semibold">{product.name}</h3>
      <p className="text-sm text-gray-600">KSh {product.price}</p>
      <div className="mt-4 flex items-center gap-2">
        <button onClick={() => setOpen(true)} className="border border-gray-200 px-3 py-2 rounded text-sm">Details</button>

        {isSellerOwner ? (
          <div className="ml-auto flex items-center gap-2">
            <ProductEditButton product={product} />

            <button onClick={async()=>{
              if (!confirm('Delete this product?')) return
              try{
                const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
                const res = await fetch(`${base}/api/products/${product._id}`, { method: 'DELETE', credentials: 'include' })
                if (res.ok){
                  try{ window.dispatchEvent(new CustomEvent('product:changed', { detail: { id: product._id } })) }catch(e){}
                  toast.success('Product deleted')
                }
                else { toast.error('Failed to delete product') }
              }catch(e){ console.error(e); toast.error('Failed to delete product') }
            }} className="bg-red-600 text-white px-3 py-1 rounded text-sm">Delete</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input aria-label="quantity" type="number" min={1} value={qty} onChange={e=>setQty(Math.max(1, Number(e.target.value || 1)))} className="w-16 p-1 text-sm border rounded" />
            <button onClick={handleAdd} disabled={loading} className="bg-red-600 text-white px-3 py-2 rounded flex items-center gap-2 disabled:opacity-50" aria-busy={loading}>
            {loading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            ) : null}
            <span>{loading ? 'Adding...' : 'Add to cart'}</span>
            </button>
          </div>
        )}
      </div>
      <ProductDetailsModal product={product} open={open} onClose={()=>setOpen(false)} onAdd={(useQty)=>addToCart(product, useQty)} />
    </div>
  )
}
