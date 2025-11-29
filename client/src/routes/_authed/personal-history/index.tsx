import { borrowHistoryQuery } from "@/lib/equipment/borrow";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { H2, LabelMedium } from "@/components/typography";
import { BACKEND_URL, Sort } from "@/lib/api";
import { UserRole } from "@/lib/user";
import { useAuth } from "@/auth";
import { EventSource } from "eventsource";
import z from "zod";
import { Control } from "./-components/control";
import { HistoryList } from "./-components/history-list";

const searchSchema = z.object({
	category: z.string().optional(),
	sort: z.enum(Sort).optional(),
	sortBy: z.string().optional(),
	search: z.string().optional(),
});

export const Route = createFileRoute("/_authed/personal-history/")({
	component: RouteComponent,
	loader: ({ context }) => {
		if (context.auth.user?.role.code !== UserRole.Borrower) {
			throw redirect({ to: "/equipments" });
		}
		context.queryClient.ensureQueryData(
			borrowHistoryQuery({ userId: context.auth.user?.id }),
		);
	},
	validateSearch: searchSchema,
});

function RouteComponent() {
	const search = useSearch({ from: "/_authed/personal-history/" });
	const auth = useAuth();
	const history = useQuery(
		borrowHistoryQuery({
			userId: auth.user?.role.code === UserRole.Borrower ? auth.user.id : undefined,
			sort: search.sort,
			sortBy: search.sortBy,
			category: search.category,
			search: search.search,
		}),
	);

	const queryClient = useQueryClient();

	useEffect(() => {
		const eventSource = new EventSource(`${BACKEND_URL}/events`);

		function handleEvent(_: MessageEvent): void {
			queryClient.invalidateQueries(borrowHistoryQuery({}));
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

			{history.isError || history.data === undefined ? (
				<LabelMedium className="text-muted text-center mt-10">
					Failed to load history
				</LabelMedium>
			) : (
				<HistoryList history={history.data} />
			)}
		</div>
	);
}
