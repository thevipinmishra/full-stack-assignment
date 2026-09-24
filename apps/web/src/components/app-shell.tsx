import { Link, Outlet } from '@tanstack/react-router'

export function AppShell() {
  return (
    <div className="min-h-dvh bg-[#f5f7f5] font-['Manrope_Variable',sans-serif] text-[#213231]">
      <a
        className="fixed -top-20 left-3 z-50 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#176c5b] shadow-sm focus:top-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c5b]"
        href="#main-content"
      >
        Skip to content
      </a>
      <header className="bg-[#17382f] text-[#f5fbf8]">
        <div className="mx-auto flex min-h-19 w-full max-w-[1450px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-12 xl:px-16">
          <Link
            className="inline-flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#99c779]"
            to="/"
            search={{ page: 1, limit: 20, sortBy: 'createdAt', sortDirection: 'desc' }}
            aria-label="Lead intake home"
          >
            <span
              className="grid size-9 shrink-0 -rotate-6 grid-cols-2 gap-[3px] rounded-[11px] bg-[#d2e9bb] p-2"
              aria-hidden="true"
            >
              <span className="rounded-[2px] bg-[#1c5d46]" />
              <span className="rounded-[2px] bg-[#1c5d46] opacity-60" />
              <span className="rounded-[2px] bg-[#1c5d46] opacity-60" />
              <span className="rounded-[2px] bg-[#1c5d46]" />
            </span>
            <span>
              <strong className="text-base leading-none font-extrabold tracking-[-0.05em]">
                Lead intake
              </strong>
            </span>
          </Link>
        </div>
      </header>
      <main id="main-content" className="min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
