'use client'
import { useEffect, useState } from 'react'
import ProductCard from '../../components/ProductCard'

export default function Menu(){
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    const fetchProducts = async ()=>{
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await fetch(`${base}/api/products`)
      const data = await res.json()
      setProducts(data)
      setLoading(false)
    }
    fetchProducts()
  },[])

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Menu</h1>
      {loading ? <p>Loading...</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {products.map(p => <ProductCard key={p._id} product={p} />)}
        </div>
      )}
    </main>
  )
}
