export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] px-4 pb-8 pt-7">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Locaus. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}
