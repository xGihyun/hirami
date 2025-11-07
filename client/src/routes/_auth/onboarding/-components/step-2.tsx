import { H1, TitleSmall } from "@/components/typography";
import { indoorBikeIllustration } from "@/lib/assets";
import type { JSX } from "react";

export function Step2(): JSX.Element {
	return (
		<section className="space-y-3.5 flex flex-col justify-center items-center w-full">
			<img
				src={indoorBikeIllustration}
				alt="Indoor bike illustration"
				className="w-full max-w-xs mx-auto"
			/>
			<div className="space-y-7.5">
				<H1 className="text-center">Borrow Smarter, Work Better</H1>
				<TitleSmall className="text-center">
					Create your account, explore available equipment, and borrow what you
					need in just a few taps.  Stay organized with quick access to your
					borrowed items and history.
				</TitleSmall>
			</div>
		</section>
	);
}
