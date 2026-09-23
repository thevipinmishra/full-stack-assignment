import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return <main className="bg-card p-4 rounded-md">
    <h1 className='font-semibold text-lg tracking-tight'>Lead intake service</h1>
  </main>
}
