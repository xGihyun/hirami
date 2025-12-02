import { borrowHistoryQuery } from "@/lib/equipment/borrow";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, type JSX } from "react";
import { H2, LabelMedium } from "@/components/typography";
import { BACKEND_URL, Sort } from "@/lib/api";
import { EventSource } from "eventsource";
import z from "zod";
import { Control } from "./-components/control";
import { ManagerHistoryList } from "./-components/manager-history-list";
import { ComponentLoading } from "@/components/loading";

const searchSchema = z.object({
	category: z.string().optional(),
	sort: z.enum(Sort).default(Sort.Asc),
	sortBy: z.string().optional(),
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

	useEffect(() => {
		const eventSource = new EventSource(`${BACKEND_URL}/events`);

		function handleEvent(_: MessageEvent): void {
			queryClient.invalidateQueries({ queryKey: ["borrow-history"] });
		}

		eventSource.addEventListener("equipment:create", handleEvent);
		eventSource.addEventListener("equipment:anomaly", handleEvent);

		return () => {
			eventSource.removeEventListener("equipment:create", handleEvent);
			eventSource.close();
		};
	}, []);

	return (
		<div className="relative space-y-4">
			<header className="flex flex-col w-full items-center justify-between gap-4">
				<H2>History</H2>
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

	if (!history.data) {
		return (
			<LabelMedium className="text-muted text-center mt-10">
				No history found.
			</LabelMedium>
		);
	}

	return <ManagerHistoryList history={history.data} />;
}
