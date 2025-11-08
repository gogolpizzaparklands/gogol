import Link from 'next/link'
import heroImg from './hero-pizza.jpeg'
import chefImg from './chef.jpeg'
import pizza1Img from './pizza1.jpeg'
import pizza2Img from './pizza2.jpeg'
import pizza3Img from './pizza3.jpeg'
import pizza4Img from './pizza4.jpeg'

export default async function Home(){
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-yellow-50 to-white">
      <section className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid gap-12 lg:grid-cols-2 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3 bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm font-medium w-max shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 2v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18 6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>

          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-gray-900">Fresh, Fast, and Unforgettable</h1>

          <p className="text-lg text-gray-600 max-w-lg">Sourdough bases, locally sourced toppings, and express delivery across Parklands & Westlands. Order your favourite pizza or build one — delivered hot and fast.</p>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Link href="/menu" className="inline-flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full shadow-lg transition">Order Now</Link>
            <Link href="/menu" className="inline-flex items-center gap-2 border border-gray-200 px-4 py-3 rounded hover:bg-gray-50">View Menu</Link>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 text-sm text-gray-700">
            <div className="flex flex-col items-start">
              <span className="font-semibold">30 min</span>
              <span className="text-gray-500">Avg delivery</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold">100k+</span>
              <span className="text-gray-500">Pizzas served</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold">4.8 ★</span>
              <span className="text-gray-500">Customer rating</span>
            </div>
          </div>

          <div className="mt-8 bg-white/90 rounded-xl p-4 shadow-sm flex items-center gap-4">
            <img src={chefImg?.src || chefImg} alt="Chef" className="w-14 h-14 rounded-full object-cover" />
            <div>
              <div className="text-sm font-semibold">Chef's Special</div>
              <div className="text-xs text-gray-500">Margherita with a spicy kick — limited time</div>
            </div>
          </div>
        </div>

        <div className="relative order-first lg:order-last">
          <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-gray-100">
            <img src={heroImg?.src || heroImg} alt="GoGol signature pizza" className="w-full h-96 object-cover" />
          </div>
          <div className="absolute -bottom-10 left-6 bg-white p-3 rounded-xl shadow-md flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden">
              <img src={pizza1Img?.src || pizza1Img} alt="mini" className="w-full h-full object-cover" />
            </div>
            <div className="text-sm">
              <div className="font-semibold">Limited Offer</div>
              <div className="text-xs text-gray-500">Get 10% off your first order</div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 mt-12">
        <h2 className="text-2xl font-semibold">Popular picks</h2>
        <p className="text-sm text-gray-500">Fan favourites — loved across Parklands & Westlands</p>
        <div className="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* creative cards — still static images but with nicer layout */}
          <article className="bg-white rounded-2xl shadow hover:shadow-lg transition overflow-hidden">
            <img src={pizza1Img?.src || pizza1Img} alt="Pepperoni" className="w-full h-44 object-cover" />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Pepperoni Classic</h3>
                <span className="text-sm font-bold">KSh 900</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Savory, spicy, and cheesy.</p>
              <div className="mt-4 flex items-center justify-between">
                <Link href="/menu" className="inline-flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-full text-sm">Order</Link>
                <button className="text-xs text-gray-500">★ Best seller</button>
              </div>
            </div>
          </article>

          <article className="bg-white rounded-2xl shadow hover:shadow-lg transition overflow-hidden">
            <img src={pizza2Img?.src || pizza2Img} alt="Margherita" className="w-full h-44 object-cover" />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Margherita</h3>
                <span className="text-sm font-bold">KSh 800</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Fresh basil, gooey cheese.</p>
              <div className="mt-4 flex items-center justify-between">
                <Link href="/menu" className="inline-flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-full text-sm">Order</Link>
                <button className="text-xs text-gray-500">✅ Veg-friendly</button>
              </div>
            </div>
          </article>

          <article className="bg-white rounded-2xl shadow hover:shadow-lg transition overflow-hidden">
            <img src={pizza3Img?.src || pizza3Img} alt="BBQ Chicken" className="w-full h-44 object-cover" />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">BBQ Chicken</h3>
                <span className="text-sm font-bold">KSh 950</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Smoky and sweet.</p>
              <div className="mt-4 flex items-center justify-between">
                <Link href="/menu" className="inline-flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-full text-sm">Order</Link>
                <button className="text-xs text-gray-500">🔥 Spicy</button>
              </div>
            </div>
          </article>

          <article className="bg-white rounded-2xl shadow hover:shadow-lg transition overflow-hidden">
            <img src={pizza4Img?.src || pizza4Img} alt="Veggie" className="w-full h-44 object-cover" />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Veggie Delight</h3>
                <span className="text-sm font-bold">KSh 850</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Loaded with fresh veggies.</p>
              <div className="mt-4 flex items-center justify-between">
                <Link href="/menu" className="inline-flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-full text-sm">Order</Link>
                <button className="text-xs text-gray-500">🥦 Healthy</button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 mt-12 bg-white rounded-xl p-8 shadow-sm">
        <div className="grid md:grid-cols-3 gap-6 items-center">
          <div>
            <h3 className="text-xl font-semibold">How it works</h3>
            <p className="text-sm text-gray-500 mt-2">Order, pay, and track — we handle the rest.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-50 rounded-full">🧾</div>
            <div>
              <div className="font-semibold">Choose</div>
              <div className="text-sm text-gray-500">Pick your favourite pizza</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-50 rounded-full">🚚</div>
            <div>
              <div className="font-semibold">Delivered</div>
              <div className="text-sm text-gray-500">Hot and on time</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="max-w-7xl mx-auto px-6 mt-12 text-center text-sm text-gray-600">© {new Date().getFullYear()} GoGol Pizza • Parklands, Nairobi • Contact: +254718144444</footer>
    </main>
  )
}
