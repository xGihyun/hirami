import { H1, TitleSmall } from "@/components/typography";
import { fitnessStatsIllustration, indoorBikeIllustration } from "@/lib/assets";
import type { JSX } from "react";

export function Step3(): JSX.Element {
	return (
		<section className="space-y-3.5 flex flex-col justify-center items-center w-full">
			<img
				src={fitnessStatsIllustration}
				alt="Fitness stats illustration"
				className="w-full max-w-xs mx-auto"
			/>
			<div className="space-y-7.5">
				<H1 className="text-center">Keep Equipment Organized and Accessible</H1>
				<TitleSmall className="text-center">
					Track equipment availability, manage requests, and keep records
					accurate.  Approve or confirm returns, register new items, and manage
					user accounts seamlessly.
				</TitleSmall>
			</div>
		</section>
	);
}
