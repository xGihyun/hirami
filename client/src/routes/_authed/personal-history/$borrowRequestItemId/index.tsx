import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authed/personal-history/$borrowRequestItemId/',
)({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authed/personal-history/$borrowRequestItemId/"!</div>
}
