import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/users/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello, World!</div>
}
