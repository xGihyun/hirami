import { H1, LabelLarge, TitleSmall } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { connectionLostIllustration } from "@/lib/assets";
import { IconArrowLeft } from "@/lib/icons";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

type Props = {
	fn: () => void;
	retry: () => Promise<void>;
};

export function Failed(props: Props): JSX.Element {
	return (
		<div className="px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] h-svh inset-0 fixed bg-background w-full z-50">
			<Button variant="ghost" size="icon" className="size-15" asChild>
				<Link to="/equipments">
					<IconArrowLeft className="size-8" />
				</Link>
			</Button>

			<main className="mt-10 pb-10">
				<div className="h-full w-full flex flex-col gap-30">
					<section className="space-y-3.5 content-center flex flex-col justify-center items-center">
						<img
							src={connectionLostIllustration}
							alt="Connection lost illustration"
							className="w-full max-w-xs mx-auto"
						/>

						<div className="space-y-1.5">
							<H1 className="text-center">Edit equipment failed.</H1>

							<TitleSmall className="text-center">
								A temporary issue occured. Please check your network and Try
								Again in a moment.
							</TitleSmall>
						</div>
					</section>

					<section className="w-full flex flex-col text-center gap-4">
						<Button onClick={props.retry}>Try Again</Button>

						<Button variant="ghost" asChild>
							<Link to="/equipments">or return to Catalog</Link>
						</Button>
					</section>
				</div>
			</main>
		</div>
	);
}
