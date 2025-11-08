import { H1 } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { homeRunIllustration } from "@/lib/assets";
import { IconArrowLeft } from "@/lib/icons";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

export function BorrowSuccess(): JSX.Element {
	return (
		<div className="h-full w-full">
			<Button variant="ghost" size="icon" className="size-15">
				<Link to="/equipments">
					<IconArrowLeft className="size-8" />
				</Link>
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
							Borrow request submitted successfully
						</H1>
					</section>

					<Button asChild>
						<Link to="/equipments">Continue</Link>
					</Button>
				</div>
			</main>
		</div>
	);
}
