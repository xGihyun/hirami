import { createFileRoute, Link } from "@tanstack/react-router";
import { LoginForm } from "./-components/form";
import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import { IconX } from "@/lib/icons";
import { PaddingLayout } from "@/routes/-components/padding-layout";
import { SideLogo } from "../-components/side-logo";

export const Route = createFileRoute("/_auth/login/")({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	return (
		<div className="flex">
			<SideLogo />

			<PaddingLayout className="w-full md:px-10 md:pt-[calc(2rem+env(safe-area-inset-top))]">
				<div className="h-full w-full relative">
					<Button variant="ghost" size="icon" className="size-15">
						<Link to="/onboarding">
							<IconX className="size-8" />
						</Link>
					</Button>

					<main className="mt-10 pb-10 max-w-sm mx-auto">
						<LoginForm />
					</main>
				</div>
			</PaddingLayout>
		</div>
	);
}
