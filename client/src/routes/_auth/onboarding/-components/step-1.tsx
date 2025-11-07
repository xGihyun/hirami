import { H1, TitleSmall } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { fitnessTrackerIllustration } from "@/lib/assets";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

export function Step1(): JSX.Element {
	return (
		<div className="h-full w-full flex flex-col justify-center items-center">
			<div className="w-full space-y-12">
				<section className="space-y-3.5 flex flex-col justify-center items-center w-full">
					<img
						src={fitnessTrackerIllustration}
						alt="Fitness tracker illustration"
						className="w-full max-w-md mx-auto"
					/>
					<div className="space-y-7.5">
						<H1 className="text-center">
							Manage and Borrow Sports Equipment with Ease
						</H1>
						<TitleSmall className="text-center">
							Hirami simplifies the way you borrow, track, and manage sports and
							gym equipment — all in one app.
						</TitleSmall>
					</div>
				</section>

				<div className="flex items-center justify-center gap-6">
					<span className="size-2.5 bg-primary rounded-full" />
					<span className="size-2.5 bg-accent rounded-full" />
					<span className="size-2.5 bg-accent rounded-full" />
				</div>

				<section className="flex flex-col gap-1 w-full">
					<Button className="w-full" asChild>
						<Link to="/onboarding" search={{ step: 2 }}>
							Next
						</Link>
					</Button>
					<Button className="w-full" variant="ghost" asChild>
						<Link to="/onboarding">Skip</Link>
					</Button>
				</section>
			</div>
		</div>
	);
}
