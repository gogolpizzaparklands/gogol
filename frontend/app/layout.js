import '../styles/globals.css'
import Navbar from '../components/Navbar'
import { CartProvider } from '../context/CartContext'
import { UserProvider } from '../context/UserContext'
import ToastProvider from '../components/ToastProvider'

export const metadata = {
  title: 'GoGol Pizza — Parklands, Nairobi',
  description: 'Pizza delivery in Parklands & Westlands — Order online from GoGol Pizza',
  keywords: ['Pizza Delivery Nairobi','Pizza Parklands','Pizza Westlands','GoGol Pizza']
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          <ToastProvider>
            <CartProvider>
              <div className="min-h-screen flex flex-col pt-20">
                <Navbar />
                {children}
              </div>
            </CartProvider>
          </ToastProvider>
        </UserProvider>
      </body>
    </html>
  )
}
