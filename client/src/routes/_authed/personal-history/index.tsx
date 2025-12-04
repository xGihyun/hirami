import {
	borrowHistoryQuery,
	BorrowRequestStatus,
	type UpdateBorrowResponse,
} from "@/lib/equipment/borrow";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type JSX } from "react";
import { H2, LabelMedium } from "@/components/typography";
import { BACKEND_URL, Sort } from "@/lib/api";
import { UserRole } from "@/lib/user";
import { useAuth } from "@/auth";
import { EventSource } from "eventsource";
import z from "zod";
import { Control } from "./-components/control";
import { HistoryList } from "./-components/history-list";
import { ComponentLoading } from "@/components/loading";
import { Success } from "@/components/success";

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
	const queryClient = useQueryClient();
	const [isReceived, setIsReceived] = useState(false);

	useEffect(() => {
		const eventSource = new EventSource(`${BACKEND_URL}/events`);

		function handleEvent(_: MessageEvent): void {
			queryClient.invalidateQueries(borrowHistoryQuery({}));
		}

		function handleBorrowRequestEvent(e: MessageEvent): void {
			const res: UpdateBorrowResponse = JSON.parse(e.data);
			setIsReceived(res.status.code === BorrowRequestStatus.Claimed);
			queryClient.invalidateQueries(borrowHistoryQuery({}));
		}

		eventSource.addEventListener("borrow-request:review", handleEvent);
		eventSource.addEventListener("equipment:anomaly", handleEvent);
		eventSource.addEventListener(
			"borrow-request:update",
			handleBorrowRequestEvent,
		);

		return () => {
			eventSource.removeEventListener("borrow-request:review", handleEvent);
			eventSource.close();
		};
	}, []);

	function reset(): void {
		setIsReceived(false);
	}

	if (isReceived) {
		return (
			<Success
				fn={reset}
				header="Successfully claimed equipments."
				backLink="/personal-history"
			/>
		);
	}

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
	const auth = useAuth();
	const history = useQuery(
		borrowHistoryQuery({
			userId:
				auth.user?.role.code === UserRole.Borrower ? auth.user.id : undefined,
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

	return <HistoryList history={history.data} />;
}
