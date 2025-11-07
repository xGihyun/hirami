import { DisplayLarge, TitleSmall } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { morningWorkoutIllustration } from "@/lib/assets";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { JSX } from "react";

export const Route = createFileRoute("/_auth/onboarding/")({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	return (
		<div className="h-full w-full flex flex-col justify-center items-center">
			<div className="w-full space-y-20">
				<section className="space-y-3.5 flex flex-col justify-center items-center w-full">
					<img
						src={morningWorkoutIllustration}
						alt="Workout illustration"
						className="w-full max-w-60 mx-auto"
					/>
					<div className="space-y-1.5">
						<DisplayLarge className="text-center">Welcome</DisplayLarge>
						<TitleSmall className="text-center">
							Log in or sign up to get started
						</TitleSmall>
					</div>
				</section>

				<section className="flex flex-col gap-2 w-full">
					<Button className="w-full" asChild>
						<Link to="/login">Log in</Link>
					</Button>
					<Button className="w-full" variant="ghost" asChild>
						<Link to="/register">Create a new account</Link>
					</Button>
				</section>
			</div>
		</div>
	);
}
