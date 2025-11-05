import type { JSX } from "react";
import { Spinner } from "./ui/spinner";

export function FullScreenLoading(): JSX.Element {
	return (
		<div className="h-svh inset-0 fixed bg-background w-full content-center">
			<Spinner className="mx-auto size-12.5 text-primary" />
		</div>
	);
}

export function ComponentLoading(): JSX.Element {
	return (
		<div className="w-full content-center">
			<Spinner className="mx-auto size-12.5 text-primary" />
		</div>
	);
}
