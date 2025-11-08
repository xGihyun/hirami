import { H1 } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { homeRunIllustration } from "@/lib/assets";
import { IconArrowLeft } from "@/lib/icons";
import type { JSX } from "react";

type Props = {
	reset: () => void;
};

export function ReturnSuccess(props: Props): JSX.Element {
	return (
		<div className="px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] h-svh inset-0 fixed bg-background w-full z-50">
			<Button
				variant="ghost"
				size="icon"
				className="size-15"
				onClick={props.reset}
			>
				<IconArrowLeft className="size-8" />
			</Button>

			<main className="mt-10 pb-10">
				<div className="h-full w-full flex flex-col gap-30">
					<section className="space-y-3.5 content-center flex flex-col justify-center items-center">
						<img
							src={homeRunIllustration}
							alt="Home run illustration"
							className="w-full max-w-xs mx-auto"
						/>

						<H1 className="text-center">
							Return request submitted successfully
						</H1>
					</section>

					<Button onClick={props.reset}>Continue</Button>
				</div>
			</main>
		</div>
	);
}
