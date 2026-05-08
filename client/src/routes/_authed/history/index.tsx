import { borrowHistoryQuery } from "@/lib/equipment/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, type JSX } from "react";
import { H1, H2, LabelMedium } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { BACKEND_URL, Sort } from "@/lib/api";
import { EventSource } from "eventsource";
import z from "zod";
import { Control } from "./-components/control";
import { ManagerHistoryList } from "./-components/manager-history-list";
import { ComponentLoading } from "@/components/loading";
import { EquipmentServerEvent } from "@/lib/equipment/sse";

const searchSchema = z.object({
	category: z.string().optional(),
	sort: z.enum(Sort).default(Sort.Asc),
	sortBy: z.string().default("borrowedAt"),
	search: z.string().optional(),
});

export const Route = createFileRoute("/_authed/history/")({
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(
			borrowHistoryQuery({
				sort: Sort.Asc,
			}),
		);
	},
	validateSearch: searchSchema,
});

function RouteComponent() {
	const queryClient = useQueryClient();
	const search = Route.useSearch();

	useEffect(() => {
		const eventSource = new EventSource(`${BACKEND_URL}/events`);

		function handleEvent(_: MessageEvent): void {
			queryClient.invalidateQueries({ queryKey: ["borrow-history"] });
		}

		eventSource.addEventListener(
			EquipmentServerEvent.EquipmentCreate,
			handleEvent,
		);
		eventSource.addEventListener(
			EquipmentServerEvent.EquipmentAnomaly,
			handleEvent,
		);

		return () => {
			eventSource.removeEventListener(
				EquipmentServerEvent.EquipmentCreate,
				handleEvent,
			);
			eventSource.removeEventListener(
				EquipmentServerEvent.EquipmentAnomaly,
				handleEvent,
			);
			eventSource.close();
		};
	}, []);

	return (
		<div className="relative space-y-4 min-w-0 ">
			<header className="flex flex-col w-full justify-between gap-4">
				<div className="flex justify-between items-center w-full">
					<H2 className="text-center md:hidden block flex-1 pl-12">History</H2>
					<H1 className="text-start md:block hidden">History</H1>
					<Button
						variant="outline"
						size="sm"
						className="gap-2"
						onClick={() => {
							const url = new URL(`${BACKEND_URL}/borrow-history/pdf`);
							if (search.category)
								url.searchParams.append("category", search.category);
							if (search.sort) url.searchParams.append("sort", search.sort);
							if (search.sortBy) url.searchParams.append("sortBy", search.sortBy);
							if (search.search) url.searchParams.append("search", search.search);
							window.open(url.toString(), "_blank");
						}}
					>
						<DownloadIcon className="size-4" />
						Download PDF
					</Button>
				</div>
				<Control />
			</header>

			<History />
		</div>
	);
}

function History(): JSX.Element {
	const search = Route.useSearch();
	const history = useQuery(
		borrowHistoryQuery({
			sort: search.sort,
			sortBy: search.sortBy,
			category: search.category,
			search: search.search,
		}),
	);

	if (history.isPending) {
		return <ComponentLoading />;
	}

	if (history.isError) {
		return (
			<LabelMedium className="text-muted text-center mt-10">
				Failed to load history.
			</LabelMedium>
		);
	}

	if (history.data.length === 0) {
		return (
			<LabelMedium className="text-muted text-center mt-10">
				No history found.
			</LabelMedium>
		);
	}

	return <ManagerHistoryList history={history.data} />;
}
