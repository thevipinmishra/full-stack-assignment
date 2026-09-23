import type { QueryClient } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'

import '../styles.css'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  return <Outlet />
}
