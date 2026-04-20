import { DisplayLarge, LabelMedium, TitleSmall } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { morningWorkoutIllustration } from "@/lib/assets";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState, type JSX } from "react";
import z from "zod";
import { Onboarding } from "./-components/onboarding";
import { PaddingLayout } from "@/routes/-components/padding-layout";
import { HiramiLogoDark } from "@/lib/assets/logo-dark";
import { SplashScreen } from "@/components/splash-screen";
import { SideLogo } from "../-components/side-logo";

const searchSchema = z.object({
	step: z.number().optional(),
});

export const Route = createFileRoute("/_auth/onboarding/")({
	component: RouteComponent,
	validateSearch: searchSchema,
	beforeLoad: ({ search }) => {
		if (search.step !== undefined && (search.step < 1 || search.step > 4)) {
			throw redirect({ to: "/onboarding", search: { step: 1 } });
		}
	},
});

function RouteComponent(): JSX.Element {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const [phase, setPhase] = useState<"splash" | "fading" | "done">("splash");

	useEffect(() => {
		const fadeTimer = setTimeout(() => setPhase("fading"), 400);
		const doneTimer = setTimeout(() => setPhase("done"), 500);
		return () => {
			clearTimeout(fadeTimer);
			clearTimeout(doneTimer);
		};
	}, []);

	// After splash, redirect to step 1 if no step is set
	useEffect(() => {
		if (phase === "done" && search.step === undefined) {
			navigate({ to: "/onboarding", search: { step: 4 } });
		}
	}, [phase, search.step]);

	const content =
		search.step === undefined ? null : search.step <= 3 ? (
			<PaddingLayout>
				<Onboarding />
			</PaddingLayout>
		) : (
			<main className="flex h-svh">
				<SideLogo />
				<Welcome />
			</main>
		);

	return (
		<>
			{content}
			{phase !== "done" && (
				<SplashScreen
					className={
						phase === "fading" ? "animate-out fade-out duration-100" : ""
					}
				/>
			)}
		</>
	);
}

function Welcome(): JSX.Element {
	return (
		<PaddingLayout className="w-full">
			<section className="h-full w-full flex flex-col justify-center items-center max-w-sm mx-auto">
				<div className="w-full space-y-20">
					<section className="space-y-3.5 flex flex-col justify-center items-center w-full">
						<div className="w-full max-w-60 mx-auto ">
							<img
								src={morningWorkoutIllustration}
								alt="Workout illustration"
								className="w-full h-full md:hidden block aspect-[24/25]"
							/>

							<HiramiLogoDark className="w-full h-fit md:block hidden" />
						</div>
						<div className="space-y-1.5">
							<DisplayLarge className="text-center">Hirami</DisplayLarge>
							<TitleSmall className="text-center">
								Log in <span className="md:hidden">or sign up </span>
								to get started
							</TitleSmall>
						</div>
					</section>

					<section className="flex flex-col gap-2 w-full">
						<Button className="w-full" asChild>
							<Link to="/login">Log in</Link>
						</Button>
						<Button
							className="w-full flex md:hidden"
							variant="secondary"
							asChild
						>
							<Link to="/register">Register</Link>
						</Button>

						<LabelMedium className="text-center mt-2">
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
			</section>
		</PaddingLayout>
	);
}
