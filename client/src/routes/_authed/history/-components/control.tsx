import type { JSX } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button.tsx";
import { IconArrowDownUp } from "@/lib/icons.ts";
import { Sort } from "@/lib/api.ts";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
	equipmentNames: string[];
};

export function Control(props: Props): JSX.Element {
	const navigate = useNavigate({ from: "/history" });
	const search = useSearch({ from: "/_authed/history/" });

	async function handleChange(value: string): Promise<void> {
		if (value === "All") {
			await navigate({
				search: (prev) => ({
					sort: prev.sort,
				}),
			});
			return;
		}

		await navigate({
			search: (prev) => ({
				...prev,
				category: value,
			}),
		});
	}

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
			<Select value={search.category || "All"} onValueChange={handleChange}>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="Select category" />
				</SelectTrigger>

				<SelectContent>
					<SelectItem value="All">All</SelectItem>

					{props.equipmentNames.map((name) => {
						return (
							<SelectItem key={name} value={name}>
								{name}
							</SelectItem>
						);
					})}
				</SelectContent>
			</Select>

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
