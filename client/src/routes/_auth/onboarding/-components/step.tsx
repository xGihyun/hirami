import { H1, TitleSmall } from "@/components/typography";
import type { JSX } from "react";
import type { StepData } from "../-model";

type Props = StepData;

export function Step(props: Props): JSX.Element {
	return (
		<section className="space-y-3.5 flex flex-col justify-center items-center w-full">
			<img
				src={props.imageUrl}
				alt="Step Illustration"
				className="w-full max-w-xs mx-auto"
			/>
			<div className="space-y-7.5">
				<H1 className="text-center">{props.title}</H1>
				<TitleSmall className="text-center">{props.description}</TitleSmall>
			</div>
		</section>
	);
}
