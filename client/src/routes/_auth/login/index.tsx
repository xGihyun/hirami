import { createFileRoute, Link } from "@tanstack/react-router";
import { LoginForm } from "./-components/form";
import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import { IconX } from "@/lib/icons";

export const Route = createFileRoute("/_auth/login/")({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	return (
		<div className="h-full w-full">
			<Button variant="ghost" size="icon" className="size-15">
				<Link to="/onboarding">
					<IconX className="size-8" />
				</Link>
			</Button>

			<main className="mt-10 pb-10">
				<LoginForm />
			</main>
		</div>
	);
}
