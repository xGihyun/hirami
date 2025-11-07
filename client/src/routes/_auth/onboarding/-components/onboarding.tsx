import type { JSX } from "react";
import { Step1 } from "./step-1";
import { Button } from "@/components/ui/button";
import { Link, useSearch } from "@tanstack/react-router";
import { Step2 } from "./step-2";
import { Step3 } from "./step-3";

type Step = {
	step: number;
	element: JSX.Element;
};

export function Onboarding(): JSX.Element {
	const search = useSearch({ from: "/_auth/onboarding/" });
	const currentStep = search.step || 1;

	const steps: Step[] = [
		{
			step: 1,
			element: <Step1 />,
		},
		{
			step: 2,
			element: <Step2 />,
		},
		{
			step: 3,
			element: <Step3 />,
		},
	];

	const currentStepData = steps.find((s) => s.step === currentStep);

	return (
		<div className="h-full w-full flex flex-col justify-center items-center">
			<div className="w-full space-y-12">
				<div className="h-[30rem] flex items-center justify-center">
					{currentStepData?.element}
				</div>

				<div className="flex items-center justify-center gap-6">
					{steps.map((step) => (
						<span
							key={step.step}
							className={`size-2.5 rounded-full ${
								step.step <= currentStep ? "bg-primary" : "bg-accent"
							}`}
						/>
					))}
				</div>

				{/* Navigation buttons */}
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
