import { cn } from "@/lib/utils";
import type { JSX, ReactNode } from "react";

type Props = {
	children?: ReactNode;
	className?: string;
};

export function PaddingLayout(props: Props): JSX.Element {
	return (
		<div
			className={cn(
				"pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] bg-background flex flex-col h-svh px-4",
				props.className,
			)}
		>
			{props.children}
		</div>
	);
}
