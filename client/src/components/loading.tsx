import type { JSX } from "react";
import { Spinner } from "./ui/spinner";
import { cn } from "@/lib/utils";

type Props = {
	className?: string;
};

export function FullScreenLoading(): JSX.Element {
	return (
		<div className="h-svh inset-0 fixed bg-background w-full content-center">
			<Spinner className="mx-auto size-12.5 text-primary" />
		</div>
	);
}

export function ComponentLoading(props: Props): JSX.Element {
	return (
		<div className={cn("w-full content-center", props.className)}>
			<Spinner className="mx-auto size-12.5 text-primary" />
		</div>
	);
}
