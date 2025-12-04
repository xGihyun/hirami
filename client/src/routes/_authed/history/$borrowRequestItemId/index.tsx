import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/history/$borrowRequestItemId/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authed/history/$borrowRequestItemId/"!</div>
}
