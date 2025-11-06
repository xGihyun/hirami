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
					dueDateSort: prev.dueDateSort,
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

	async function toggleSort(value: Sort): Promise<void> {
		if (value === Sort.Asc) {
			await navigate({
				search: (prev) => ({
					...prev,
					dueDateSort: Sort.Desc,
				}),
			});
			return;
		}

		await navigate({
			search: (prev) => ({
				...prev,
				dueDateSort: Sort.Asc,
			}),
		});
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

			<Button
				className="size-12 bg-card text-card-foreground border border-accent shadow-none"
				onClick={() => toggleSort(search.dueDateSort)}
			>
				<IconArrowDownUp className="size-5" />
			</Button>
		</div>
	);
}
