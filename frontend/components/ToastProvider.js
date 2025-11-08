'use client'
import React, { createContext, useContext, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useEffect } from 'react'

const ToastContext = createContext(null)

export function useToast(){
  return useContext(ToastContext)
}

let idCounter = 1

export function ToastProvider({ children }){
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)

  // toasts store shape: { id, type, message, timeout, createdAt, remaining, timer }
  const addToast = useCallback((type, message, opts={timeout:4000})=>{
    const id = idCounter++
    const timeout = opts.timeout || 4000
    const createdAt = Date.now()
    const tObj = { id, type, message, timeout, createdAt, remaining: timeout }
    setToasts(t => [...t, tObj])
    return id
  }, [])

  const removeToast = useCallback((id)=> setToasts(t => t.filter(x=>x.id!==id)), [])

  // connect to socket and listen for payment/order events to show toasts
  useEffect(()=>{
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
    try{
      const socket = io(base, { transports: ['websocket'], withCredentials: true })
      socket.on('connect', ()=>{})
      socket.on('mpesaStatus', (payload)=>{
        if (payload.success) addToast('success', `Payment received for order ${payload.orderId}. Receipt: ${payload.receipt || ''}`)
        else addToast('error', `Payment failed for order ${payload.orderId}. Code: ${payload.resultCode || 'N/A'}`)
      })
      socket.on('orderUpdated', (payload)=>{
        addToast('info', `Order ${payload.orderId} status: ${payload.status}`)
      })
      return ()=>{ socket.disconnect() }
    }catch(e){ console.error('Socket client error', e) }
  }, [addToast])

  

  const showConfirm = useCallback((message)=>{
    return new Promise((resolve)=>{
      setConfirmState({ message, resolve })
    })
  }, [])

  const confirmCancel = () => {
    if (confirmState && confirmState.resolve) confirmState.resolve(false)
    setConfirmState(null)
  }
  const confirmOk = () => {
    if (confirmState && confirmState.resolve) confirmState.resolve(true)
    setConfirmState(null)
  }

  const ctx = {
    toast: {
      success: (msg, opts)=> addToast('success', msg, opts),
      error: (msg, opts)=> addToast('error', msg, opts),
      info: (msg, opts)=> addToast('info', msg, opts),
      warn: (msg, opts)=> addToast('warn', msg, opts),
      remove: removeToast
    },
    confirm: showConfirm
  }

  // manage auto-dismiss timers for toasts: schedule removal for new toasts
  useEffect(()=>{
    toasts.forEach(t => {
      if (t.timer || t.paused) return
      // schedule removal
      const timer = setTimeout(()=>{
        removeToast(t.id)
      }, t.remaining || t.timeout)
      // attach timer id
      setToasts(prev => prev.map(x => x.id === t.id ? { ...x, timer } : x))
    })
    // cleanup: clear timers for toasts that were removed
    return ()=>{
      toasts.forEach(t => { if (t.timer) clearTimeout(t.timer) })
    }
  }, [toasts, removeToast])

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
        <div aria-live="polite" aria-atomic="true" className="pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} role={t.type==='error'?'alert':'status'} className={`pointer-events-auto max-w-sm w-full shadow-lg rounded p-3 text-sm flex items-start gap-3 transform transition duration-300 ease-out ${t.type==='success'?'bg-green-50 border border-green-200 text-green-800':t.type==='error'?'bg-red-50 border border-red-200 text-red-800':t.type==='warn'?'bg-yellow-50 border border-yellow-200 text-yellow-800':'bg-white border'}`} onMouseEnter={() => {
                // pause auto-dismiss
                setToasts(prev => prev.map(x => x.id === t.id ? ({ ...x, paused: true, pauseAt: Date.now(), timer: x.timer ? (clearTimeout(x.timer), null) : null }) : x))
              }} onMouseLeave={() => {
                // resume and adjust remaining
                setToasts(prev => prev.map(x => {
                  if (x.id !== t.id) return x
                  if (!x.paused) return x
                  const pausedFor = Date.now() - (x.pauseAt || Date.now())
                  const remaining = Math.max(0, (x.remaining || x.timeout) - pausedFor)
                  // schedule removal
                  if (remaining <= 0) {
                    setTimeout(() => removeToast(t.id), 50)
                    return { ...x, remaining: 0, paused: false }
                  }
                  const timer = setTimeout(() => removeToast(t.id), remaining)
                  return { ...x, remaining, paused: false, timer }
                }))
              }}>
              <div className="flex-shrink-0 mt-0.5">
                {t.type==='success' && (
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                )}
                {t.type==='error' && (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                )}
                {t.type==='info' && (
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 6v.01"></path></svg>
                )}
                {t.type==='warn' && (
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path></svg>
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold capitalize">{t.type}</div>
                <div className="mt-1">{t.message}</div>
              </div>
              <button onClick={()=> removeToast(t.id)} aria-label="Close notification" className="text-gray-500 hover:text-gray-800">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmState && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded shadow max-w-md w-full p-6">
            <div className="text-lg font-semibold">Confirm</div>
            <div className="mt-3">{confirmState.message}</div>
            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={confirmCancel} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={confirmOk} className="px-4 py-2 bg-red-600 text-white rounded">OK</button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export default ToastProvider
