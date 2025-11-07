import { H1, TitleSmall } from "@/components/typography";
import { fitnessTrackerIllustration } from "@/lib/assets";
import type { JSX } from "react";

export function Step1(): JSX.Element {
	return (
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
					Hirami simplifies the way you borrow, track, and manage sports and gym
					equipment — all in one app.
				</TitleSmall>
			</div>
		</section>
	);
}
