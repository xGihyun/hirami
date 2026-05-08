import { H1 } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { homeRunIllustration } from "@/lib/assets";
import { IconArrowLeft } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { PaddingLayout } from "@/routes/-components/padding-layout";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

type Props = {
	fn?: () => void;
	header: string;
	backLink: string;
	illustration?: string;
	className?: string;
};

export function Success(props: Props): JSX.Element {
	return (
		<PaddingLayout
			className={cn(
				"md:bg-white md:p-0 h-svh inset-0 bg-background w-full z-50",
				props.className,
			)}
		>
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

			<main className="mt-10 pb-10 flex justify-center items-center w-full">
				<div className="h-full w-full flex flex-col gap-25 max-w-md mx-auto items-center justify-center">
					<section className="space-y-3.5 content-center flex flex-col justify-center items-center">
						<img
							src={
								props.illustration ? props.illustration : homeRunIllustration
							}
							alt="Home run illustration"
							className="w-full max-w-xs md:max-w-none mx-auto aspect-[320/277]"
						/>

						<H1 className="text-center">{props.header}</H1>
					</section>

					<Button onClick={props.fn} className="w-full" asChild>
						<Link to={props.backLink}>Continue</Link>
					</Button>
				</div>
			</main>
		</PaddingLayout>
	);
}
