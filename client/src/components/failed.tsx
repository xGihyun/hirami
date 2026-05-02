import {
	DisplayLarge,
	H1,
	TitleMedium,
	TitleSmall,
} from "@/components/typography";
import { Button } from "@/components/ui/button";
import { connectionLostIllustration } from "@/lib/assets";
import { IconArrowLeft } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { PaddingLayout } from "@/routes/-components/padding-layout";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

type Props = {
	fn?: () => void;
	retry?: () => void;
	header: string;
	backLink: string;
	backMessage?: string;
	illustration?: string;
	className?: string;
};

export function Failed(props: Props): JSX.Element {
	const description =
		"A temporary issue occured. Please check your network and Try Again in a moment.";

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

			<main className="mt-10 pb-10">
				<div className="h-full w-full flex flex-col gap-25 max-w-4xl mx-auto items-center justify-center">
					<section className="space-y-3.5 content-center flex flex-col justify-center items-center">
						<img
							src={
								props.illustration
									? props.illustration
									: connectionLostIllustration
							}
							alt="Connection lost illustration"
							className="w-full max-w-xs md:max-w-md mx-auto"
						/>

						<div className="space-y-1.5">
							<H1 className="text-center block md:hidden">{props.header}</H1>
							<DisplayLarge className="text-center hidden md:block">
								{props.header}
							</DisplayLarge>

							<TitleSmall className="text-center block md:hidden">
								{description}
							</TitleSmall>
							<TitleMedium className="text-center hidden md:block">
								{description}
							</TitleMedium>
						</div>
					</section>

					<section className="w-full flex flex-col text-center gap-2 max-w-md">
						<Button onClick={props.retry}>Try Again</Button>

						{props.backMessage ? (
							<Button variant="ghost" asChild>
								<Link to={props.backLink}>{props.backMessage}</Link>
							</Button>
						) : null}
					</section>
				</div>
			</main>
		</PaddingLayout>
	);
}
