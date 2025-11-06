import { borrowHistoryQuery } from "@/lib/equipment/borrow";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
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
	dueDateSort: z.enum(Sort).default(Sort.Asc),
});

export const Route = createFileRoute("/_authed/history/")({
	component: RouteComponent,
	loader: ({ context }) => {
		if (context.session.user.role === UserRole.Borrower) {
			context.queryClient.ensureQueryData(
				borrowHistoryQuery({ userId: context.session.user.id, sort: Sort.Asc }),
			);
			return;
		}
		context.queryClient.ensureQueryData(borrowHistoryQuery({}));
	},
	validateSearch: searchSchema,
});

function RouteComponent() {
	const search = useSearch({ from: "/_authed/history/" });
	const auth = useAuth();
	const history = useQuery(
		borrowHistoryQuery({
			userId: auth.user?.role === UserRole.Borrower ? auth.user.id : undefined,
			sort: search.dueDateSort,
			category: search.category,
		}),
	);
	const historyAllCategory = useQuery(
		borrowHistoryQuery({
			userId: auth.user?.role === UserRole.Borrower ? auth.user.id : undefined,
			sort: search.dueDateSort,
		}),
	);
	const historyEquipmentNames = historyAllCategory.data?.flatMap((history) =>
		history.equipments.map((eq) => eq.name),
	);

	const queryClient = useQueryClient();

	useEffect(() => {
		const eventSource = new EventSource(`${BACKEND_URL}/events`);

		function handleEvent(_: MessageEvent): void {
			queryClient.invalidateQueries(
				borrowHistoryQuery({
					userId:
						auth.user?.role === UserRole.Borrower ? auth.user.id : undefined,
					sort: search.dueDateSort,
					category: search.category,
				}),
			);
		}

		eventSource.addEventListener("equipment:create", handleEvent);

		return () => {
			eventSource.removeEventListener("equipment:create", handleEvent);
			eventSource.close();
		};
	}, [queryClient]);

	return (
		<div className="relative space-y-4">
			<header className="flex flex-col w-full items-center justify-between gap-4">
				<H2>History</H2>
				<Control equipmentNames={historyEquipmentNames || []} />
			</header>

			{history.isError || history.data === undefined ? (
				<LabelMedium className="text-muted text-center mt-10">
					Failed to load equipment catalog
				</LabelMedium>
			) : (
				<HistoryList history={history.data} />
			)}
		</div>
	);
}
