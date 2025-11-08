import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import { Link, useSearch } from "@tanstack/react-router";
import { Step } from "./step";
import {
	fitnessTrackerIllustration,
	indoorBikeIllustration,
	fitnessStatsIllustration,
} from "@/lib/assets";
import type { StepData } from "../-model";

export function Onboarding(): JSX.Element {
	const search = useSearch({ from: "/_auth/onboarding/" });
	const currentStep = search.step || 1;

	const steps: StepData[] = [
		{
			imageUrl: fitnessTrackerIllustration,
			title: "Manage and Borrow Sports Equipment with Ease",
			description:
				"Hirami simplifies the way you borrow, track, and manage sports and gym equipment — all in one app.",
		},
		{
			imageUrl: indoorBikeIllustration,
			title: "Borrow Smarter, Work Better",
			description:
				"Create your account, explore available equipment, and borrow what you need in just a few taps.  Stay organized with quick access to your borrowed items and history.",
		},
		{
			imageUrl: fitnessStatsIllustration,
			title: "Keep Equipment Organized and Accessible",
			description:
				"Track equipment availability, manage requests, and keep records accurate.  Approve or confirm returns, register new items, and manage user accounts seamlessly.",
		},
	];

	const currentStepData = steps[currentStep - 1];

	return (
		<div className="h-full w-full flex flex-col justify-center items-center">
			<div className="w-full space-y-12">
				<div className="h-[30rem] flex items-center justify-center relative">
					{steps.map((stepData, index) => (
						<div
							key={index}
							className={`absolute inset-0 flex items-center justify-center ${
								index + 1 === currentStep ? "block" : "hidden"
							}`}
						>
							<Step {...stepData} />
						</div>
					))}
				</div>

				<div className="flex items-center justify-center gap-6">
					{steps.map((_, i) => (
						<span
							key={i}
							className={`size-2.5 rounded-full ${
								i + 1 <= currentStep ? "bg-primary" : "bg-accent"
							}`}
						/>
					))}
				</div>

				<section className="flex flex-col gap-1 w-full">
					<Button className="w-full" asChild>
						<Link
							to="/onboarding"
							search={{
								step: currentStep <= steps.length ? currentStep + 1 : undefined,
							}}
						>
							Next
						</Link>
					</Button>
					<Button className="w-full" variant="ghost" asChild>
						<Link to="/login">Skip</Link>
					</Button>
				</section>
			</div>
		</div>
	);
}
