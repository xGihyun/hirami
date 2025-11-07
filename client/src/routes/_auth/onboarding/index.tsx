import { DisplayLarge, TitleSmall } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { morningWorkoutIllustration } from "@/lib/assets";
import {
	createFileRoute,
	Link,
	redirect,
	useSearch,
} from "@tanstack/react-router";
import type { JSX } from "react";
import z from "zod";
import { Step1 } from "./-components/step-1";
import { Step2 } from "./-components/step-2";
import { Step3 } from "./-components/step-3";

const searchSchema = z.object({
	step: z.number().optional(),
});

export const Route = createFileRoute("/_auth/onboarding/")({
	component: RouteComponent,
	validateSearch: searchSchema,
	beforeLoad: ({ search }) => {
		if (!search.step) {
			return;
		}

		if (search.step < 1 || search.step > 3) {
			throw redirect({ to: "/onboarding" });
		}
	},
});

function RouteComponent(): JSX.Element {
	const search = useSearch({ from: "/_auth/onboarding/" });

	if (!search.step) {
		return <Onboarding />;
	}

	if (search.step === 1) {
		return <Step1 />;
	}

	if (search.step === 2) {
		return <Step2 />;
	}

	if (search.step === 3) {
		return <Step3 />;
	}

	return <Onboarding />;
}

function Onboarding(): JSX.Element {
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
