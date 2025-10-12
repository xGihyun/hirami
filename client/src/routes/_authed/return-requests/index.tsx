import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/return-requests/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authed/return-requests/"!</div>
}
