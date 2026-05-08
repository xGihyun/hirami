import type { JSX } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button.tsx";
import { IconArrowDown, IconArrowDownUp, IconArrowUp } from "@/lib/icons.ts";
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

	async function updateSort(field: SortField, order: Sort): Promise<void> {
		await navigate({
			search: (prev) => ({
				...prev,
				sortBy: field,
				sort: order,
			}),
		});
	}

	function handleSortChange(field: SortField) {
		if (search.sortBy === field) {
			const currentOrder = search.sort || Sort.Asc;
			const newOrder = currentOrder === Sort.Asc ? Sort.Desc : Sort.Asc;
			updateSort(field, newOrder);
			return;
		}

		updateSort(field, Sort.Asc);
	}

	function renderSortIcon(field: SortField) {
		return (
			<div className="flex items-center justify-center size-6 mr-1">
				{search.sortBy === field ? (
					search.sort === Sort.Desc ? (
						<IconArrowDown className="size-4" />
					) : (
						<IconArrowUp className="size-4" />
					)
				) : null}
			</div>
		);
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
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={() => handleSortChange("borrowedAt")}>
						{renderSortIcon("borrowedAt")}
						Date and Time Borrowed
					</DropdownMenuItem>

					<DropdownMenuItem onClick={() => handleSortChange("returnedAt")}>
						{renderSortIcon("returnedAt")}
						Date and Time Returned
					</DropdownMenuItem>

					<DropdownMenuItem onClick={() => handleSortChange("status")}>
						{renderSortIcon("status")}
						Status
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
