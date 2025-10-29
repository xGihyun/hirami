import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/_register/register/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_auth/_register/register/"!</div>
}
