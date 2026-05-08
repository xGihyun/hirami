import { HiramiLogoDark } from "@/lib/assets/logo-dark";
import type { JSX } from "react";
import { DisplayLarge, TitleSmall } from "./typography";
import { cn } from "@/lib/utils";

type Props = {
	className?: string;
};

export function SplashScreen(props: Props): JSX.Element {
	return (
		<div
			className={cn(
				"h-svh fixed inset-0 w-full bg-gradient-to-b from-secondary to-primary flex flex-col items-center justify-center text-center z-500",
				props.className,
			)}
		>
			<div className="max-w-64 space-y-2.5">
				<HiramiLogoDark className="w-full h-fit" />
				<DisplayLarge>Hirami</DisplayLarge>
				<TitleSmall>Equipment Management System</TitleSmall>
			</div>
		</div>
	);
}
