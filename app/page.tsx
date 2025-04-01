export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-4 border-b">
        <div className="container mx-auto px-4">
          <h1 className="text-xl font-bold">Номын Портал</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-6">Номын Портал</h1>
          <p className="text-xl mb-8">Тусгай эрхтэй хэрэглэгчдэд зориулсан онлайн сургалтын платформ</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/login"
              className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Нэвтрэх
            </a>
            <a
              href="/register"
              className="px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              Бүртгүүлэх
            </a>
          </div>
        </div>
      </main>

      <footer className="py-4 border-t">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Нацагдорж Багшийн Номын Портал. Бүх эрх хуулиар хамгаалагдсан.
          </p>
        </div>
      </footer>
    </div>
  )
}

