import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/users/$userId/register/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authed/users/$userId/register/"!</div>
}
