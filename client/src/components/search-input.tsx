import { useId, type JSX } from "react";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchInput({
	className,
	type,
	...props
}: React.ComponentProps<"input">): JSX.Element {
	const id = useId();
	return (
		<div className="*:not-first:mt-2">
			<div className="relative">
				<Input
					id={id}
					className={cn("peer ps-12 pe-9", className)}
					placeholder="Search..."
					type="search"
					{...props}
				/>

				<div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
					<SearchIcon size={24} />
				</div>
			</div>
		</div>
	);
}
