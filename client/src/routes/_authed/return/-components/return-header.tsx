import { H2 } from "@/components/typography";
import type { JSX } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReturnTab } from "../-model.ts";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button.tsx";
import { IconArrowDownUp } from "@/lib/icons.ts";
import { Sort } from "@/lib/api.ts";

type Props = {
	equipmentNames: string[];
};

export function ReturnHeader(props: Props): JSX.Element {
	const navigate = useNavigate({ from: "/return" });
	const search = useSearch({ from: "/_authed/return/" });

	async function handleChange(value: string): Promise<void> {
		if (value === "All") {
			await navigate({
				to: "/return",
				search: (prev) => ({
					tab: prev.tab,
					dueDateSort: prev.dueDateSort,
				}),
			});
			return;
		}

		await navigate({
			to: "/return",
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
		<header className="flex flex-col w-full items-center justify-between gap-4">
			<H2>Return</H2>

			<Tabs value={search.tab} className="w-full">
				<TabsList className="w-full">
					<TabsTrigger value={ReturnTab.BorrowedItems} asChild>
						<Link to="/return" search={{ tab: ReturnTab.BorrowedItems }}>
							Borrowed Items
						</Link>
					</TabsTrigger>
					<TabsTrigger value={ReturnTab.ReturnRequestList} asChild>
						<Link to="/return" search={{ tab: ReturnTab.ReturnRequestList }}>
							Return Request List
						</Link>
					</TabsTrigger>
				</TabsList>
			</Tabs>

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
		</header>
	);
}
