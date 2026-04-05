import { UndrawMorningWorkout } from "@/lib/assets/undraw-morning-workout";
import { cn } from "@/lib/utils";
import { PaddingLayout } from "@/routes/-components/padding-layout";
import type { JSX } from "react";

type Props = {
	className?: string;
};

export function SideLogo(props: Props): JSX.Element {
	return (
		<section
			className={cn(
				"w-full h-full bg-gradient-to-b from-secondary to-primary hidden md:flex items-center justify-center",
				props.className,
			)}
		>
			<PaddingLayout>
				<UndrawMorningWorkout className="w-full h-full hidden md:block aspect-[24/25] max-w-md text-tertiary" />
			</PaddingLayout>
		</section>
	);
}
