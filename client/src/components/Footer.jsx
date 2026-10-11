export default function Footer() {
  return (
    <footer className="border-t border-gray-800 px-4 py-8 lg:pl-[276px] xl:pl-[296px] xl:pr-[336px]">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Ashow e Jazer. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}
