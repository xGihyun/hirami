import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/profile/")({
	component: RouteComponent,
});

function RouteComponent() {
	const auth = useAuth();
	const navigate = Route.useNavigate();

	async function handleLogout(): Promise<void> {
		await auth.logout();
		await navigate({ to: "/login" });
	}

	return (
		<div>
			<Button onClick={handleLogout}>Log Out</Button>
			<Button
				onClick={() => toast("TEST", { duration: Number.POSITIVE_INFINITY })}
			>
				Toast
			</Button>
		</div>
	);
}
