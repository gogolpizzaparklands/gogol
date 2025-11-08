'use client'
import React, { createContext, useState, useEffect, useContext, useRef } from 'react'
import { UserContext } from './UserContext'

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const { user } = useContext(UserContext)
  const saveRef = useRef(null)

  // load from localStorage initially
  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('gogol_cart');
    if (saved) setCart(JSON.parse(saved));
  }, []);

  // persist to localStorage always
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('gogol_cart', JSON.stringify(cart));
  }, [cart]);

  // When user logs in, fetch server cart and merge or replace as appropriate
  useEffect(() => {
    const syncFromServer = async () => {
      try{
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
        const res = await fetch(`${base}/api/cart`, { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        const serverCart = data.cart || []
        // if serverCart empty but local has items -> push local to server
        if (serverCart.length === 0 && cart.length > 0) {
          await fetch(`${base}/api/cart`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart }) })
          return
        }
        // if server has items and local is empty -> adopt server cart
        if (serverCart.length > 0 && cart.length === 0) {
          setCart(serverCart)
          return
        }
        // if both have items, merge conservatively: choose the max quantity per product (avoid double-counting)
        if (serverCart.length > 0 && cart.length > 0) {
          const map = new Map()
          serverCart.forEach(i => map.set(String(i.product), { ...i }))
          cart.forEach(i => {
            const key = String(i.product)
            if (map.has(key)) {
              // take the maximum of server and local quantities
              const existing = map.get(key)
              existing.qty = Math.max(Number(existing.qty || 0), Number(i.qty || 0))
              map.set(key, existing)
            } else map.set(key, { ...i })
          })
          const merged = Array.from(map.values())
          setCart(merged)
          // persist merged to server
          await fetch(`${base}/api/cart`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: merged }) })
        }
      }catch(e){ console.error('syncFromServer error', e) }
    }
    if (user) syncFromServer()
    // if user logged out, we keep localStorage cart as-is
  }, [user])

  // save cart to server when it changes and user is logged in (debounced)
  useEffect(() => {
    if (!user) return
    if (saveRef.current) clearTimeout(saveRef.current)
    saveRef.current = setTimeout(async ()=>{
      try{
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
        await fetch(`${base}/api/cart`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart }) })
      }catch(e){ console.error('saveCart error', e) }
    }, 700)
    return ()=>{ if (saveRef.current) clearTimeout(saveRef.current) }
  }, [cart, user])

  const addToCart = (product, qty = 1) => {
    const addQty = Number(qty) || 1
    setCart(prev => {
      const pid = String(product._id)
      const idx = prev.findIndex(p => String(p.product) === pid);
      if (idx > -1) {
        const prevQty = Number(prev[idx].qty || 0)
        const newQty = prevQty + addQty
        console.debug('[Cart] addToCart', { pid, addQty, prevQty, newQty })
        const clone = [...prev];
        clone[idx].qty = newQty;
        return clone;
      }
      console.debug('[Cart] addToCart (new)', { pid, addQty })
      return [...prev, { product: product._id, name: product.name, price: product.price, qty: addQty }];
    });
  };

  const removeFromCart = (productId, qty = null) => setCart(prev => {
    const idx = prev.findIndex(p => p.product === productId)
    if (idx === -1) return prev
    if (qty === null) {
      // remove entire line
      return prev.filter(p => p.product !== productId)
    }
    const clone = [...prev]
    const current = clone[idx].qty || 0
    const newQty = current - Number(qty)
    if (newQty > 0) {
      clone[idx].qty = newQty
      return clone
    }
    return clone.filter(p => p.product !== productId)
  })
  const clearCart = () => setCart([]);
  const updateQty = (productId, newQty) => setCart(prev => {
    const idx = prev.findIndex(p => p.product === productId)
    if (idx === -1) return prev
    const clone = [...prev]
    if (newQty <= 0) {
      clone.splice(idx,1)
      return clone
    }
    clone[idx].qty = Number(newQty)
    return clone
  })
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, total, updateQty }}>
      {children}
    </CartContext.Provider>
  )
}
