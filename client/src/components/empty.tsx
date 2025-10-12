import { IconEmpty } from "@/lib/icons";
import type { JSX, ReactNode } from "react";

export function EmptyState({ children }: { children?: ReactNode }): JSX.Element {
	return (
		<div className="flex flex-col items-center justify-center py-12 text-center">
			<IconEmpty className="size-12 text-muted-foreground mb-4" />
			<p className="text-muted-foreground">{children}</p>
		</div>
	);
}
