import {
	DisplayLarge,
	LabelLarge,
	LabelMedium,
	LabelSmall,
	TitleSmall,
} from "@/components/typography";
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
import { Onboarding } from "./-components/onboarding";
import { openPath } from "@tauri-apps/plugin-opener";

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

	if (search.step) {
		return <Onboarding />;
	}

	return <Welcome />;
}

function Welcome(): JSX.Element {
	// async function handleOpen(): Promise<void> {
	// 	await openPath("Hirami - Privacy Policy and T&C.pdf");
	// }

	return (
		<div className="h-full w-full flex flex-col justify-center items-center">
			<div className="w-full space-y-20">
				<section className="space-y-3.5 flex flex-col justify-center items-center w-full">
					<div className="w-full max-w-60 mx-auto aspect-[24/25]">
						<img
							src={morningWorkoutIllustration}
							alt="Workout illustration"
							className="w-full h-full"
						/>
					</div>
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

					<LabelMedium className="underline text-center text-primary mt-10">
						<a
							href="https://docs.google.com/document/d/1LYMJ3kEMjBGzp_XxVLRCjC7Ht69krWmOeiQq3TP7jCE/edit?usp=sharing"
							rel="noreferrer"
							target="_blank"
						>
							Privacy Policy & Terms and Conditions
						</a>
					</LabelMedium>
				</section>
			</div>
		</div>
	);
}
