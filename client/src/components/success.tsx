import { H1 } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { homeRunIllustration } from "@/lib/assets";
import { IconArrowLeft } from "@/lib/icons";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

type Props = {
	fn?: () => void;
	header: string;
	backLink: string;
};

export function Success(props: Props): JSX.Element {
	return (
		<div className="px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] h-svh inset-0 fixed bg-background w-full z-50">
			<Button
				variant="ghost"
				size="icon"
				className="size-15"
				onClick={props.fn}
				asChild
			>
				<Link to={props.backLink}>
					<IconArrowLeft className="size-8" />
				</Link>
			</Button>

			<main className="mt-10 pb-10">
				<div className="h-full w-full flex flex-col gap-30">
					<section className="space-y-3.5 content-center flex flex-col justify-center items-center">
						<img
							src={homeRunIllustration}
							alt="Home run illustration"
							className="w-full max-w-xs mx-auto aspect-[320/277]"
						/>

						<H1 className="text-center">{props.header}</H1>
					</section>

					<Button onClick={props.fn} asChild>
						<Link to={props.backLink}>Continue</Link>
					</Button>
				</div>
			</main>
		</div>
	);
}
