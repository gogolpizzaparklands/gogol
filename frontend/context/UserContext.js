'use client'
import React, { createContext, useState, useEffect } from 'react'

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = async ()=>{
    try{
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await fetch(`${base}/api/auth/me`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    }catch(err){ setUser(null) }
    setLoading(false)
  }

  useEffect(()=>{ fetchMe() }, [])

  return (
    <UserContext.Provider value={{ user, setUser, loading, refetch: fetchMe }}>
      {children}
    </UserContext.Provider>
  )
}
