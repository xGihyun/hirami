import type { JSX } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button.tsx";
import { IconArrowDownUp } from "@/lib/icons.ts";
import { Sort } from "@/lib/api.ts";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HistorySearch } from "./history-search";

export function Control(): JSX.Element {
	const navigate = useNavigate({ from: "/personal-history" });
	const search = useSearch({ from: "/_authed/personal-history/" });

	type SortField = "borrowedAt" | "returnedAt" | "status";

	async function toggleSort(field: SortField, order: Sort): Promise<void> {
		const newOrder = order === Sort.Asc ? Sort.Desc : Sort.Asc;

		await navigate({
			search: (prev) => ({
				...prev,
				sortBy: field,
				sort: newOrder,
			}),
		});
	}

	function handleSortChange(field: SortField) {
		if (search.sortBy === field) {
			toggleSort(field, search.sort);
			return;
		}

		toggleSort(field, Sort.Asc);
	}

	return (
		<div className="flex w-full gap-5">
			<HistorySearch />

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button className="size-12 bg-card text-card-foreground border border-accent shadow-none">
						<IconArrowDownUp className="size-5" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem onClick={() => handleSortChange("borrowedAt")}>
						Date and Time Borrowed
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => handleSortChange("returnedAt")}>
						Date and Time Returned
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => handleSortChange("status")}>
						Status
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
