import { useAuth } from "@/auth";
import { BACKEND_URL, Sort } from "@/lib/api";
import { borrowedItemsQuery } from "@/lib/equipment/borrow";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type JSX } from "react";
import { returnRequestsQuery } from "@/lib/equipment/return";
import { equipmentNamesQuery } from "@/lib/equipment";
import { EventSource } from "eventsource";
import { ReturnHeader } from "./-components/return-header";
import z from "zod";
import { ReturnTab } from "./-model";
import { ReturnRequestList } from "./-components/return-request-list";
import { ComponentLoading } from "@/components/loading";
import { LabelMedium } from "@/components/typography";
import { BorrowedItemList } from "./-components/borrowed-item-list";
import { Success } from "@/components/success";

const searchSchema = z.object({
	tab: z.enum(ReturnTab).default(ReturnTab.BorrowedItems),
	category: z.string().optional(),
	dueDateSort: z.enum(Sort).default(Sort.Asc),
});

export const Route = createFileRoute("/_authed/return/")({
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(
			borrowedItemsQuery({
				userId: context.auth.user?.id,
				sort: Sort.Asc,
			}),
		);
		context.queryClient.ensureQueryData(
			returnRequestsQuery({ userId: context.auth.user?.id }),
		);
		context.queryClient.ensureQueryData(equipmentNamesQuery());
	},
	validateSearch: searchSchema,
});

function RouteComponent(): JSX.Element {
	const search = Route.useSearch();
	const auth = useAuth();
	const [isConfirmed, setIsConfirmed] = useState(false);

	// NOTE: Naive way to make sure the available options in equipment names are
	// only the equipments included in the history or return request
	const borrowHistoryAllCategory = useQuery(
		borrowedItemsQuery({
			userId: auth.user?.id,
			sort: search.dueDateSort,
		}),
	);
	const returnRequestsAllCategory = useQuery(
		returnRequestsQuery({
			userId: auth.user?.id,
			sort: search.dueDateSort,
		}),
	);
	// NOTE: Getting the unique names should ideally be done on the server
	const historyEquipmentNames = Array.from(
		new Set(
			borrowHistoryAllCategory.data?.flatMap((history) =>
				history.equipments.map((eq) => eq.name),
			),
		),
	);
	const returnEquipmentNames = Array.from(
		new Set(
			returnRequestsAllCategory.data?.flatMap((req) =>
				req.equipments.map((eq) => eq.name),
			),
		),
	);
	const equipmentNames =
		search.tab === ReturnTab.BorrowedItems
			? historyEquipmentNames
			: returnEquipmentNames;

	const queryClient = useQueryClient();

	useEffect(() => {
		const eventSource = new EventSource(`${BACKEND_URL}/events`);

		function handleEvent(_: MessageEvent): void {
			queryClient.invalidateQueries(
				borrowedItemsQuery({
					userId: auth.user?.id,
				}),
			);
			queryClient.invalidateQueries(
				returnRequestsQuery({
					userId: auth.user?.id,
				}),
			);

			setIsConfirmed(true);
		}

		eventSource.addEventListener("return-request:confirm", handleEvent);

		return () => {
			eventSource.removeEventListener("return-request:confirm", handleEvent);
			eventSource.close();
		};
	}, []);

	function reset(): void {
		setIsConfirmed(false);
	}

	if (isConfirmed) {
		return (
			<Success
				fn={reset}
				header="Successfully returned equipments."
				backLink="/return"
			/>
		);
	}

	return (
		<main className="space-y-4 pb-15 !mb-0">
			<ReturnHeader equipmentNames={equipmentNames || []} />

			{search.tab === ReturnTab.BorrowedItems ? (
				<BorrowedItemList />
			) : (
				<ReturnRequestListTab />
			)}
		</main>
	);
}

function ReturnRequestListTab(): JSX.Element {
	const search = Route.useSearch();
	const auth = useAuth();
	const returnRequests = useQuery(
		returnRequestsQuery({
			userId: auth.user?.id,
			category: search.category,
			sort: search.dueDateSort,
		}),
	);

	if (returnRequests.isLoading) {
		return <ComponentLoading />;
	}

	if (returnRequests.data?.length === 0) {
		return (
			<LabelMedium className="text-muted text-center mt-10">
				No equipments for returning found
			</LabelMedium>
		);
	}

	return <ReturnRequestList returnRequests={returnRequests.data || []} />;
}
