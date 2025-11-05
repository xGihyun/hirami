import { useAuth } from "@/auth";
import { BACKEND_URL, Sort } from "@/lib/api";
import {
	borrowHistoryQuery,
	BorrowRequestStatus,
} from "@/lib/equipment/borrow";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, type JSX } from "react";
import { ReturnEquipmentForm } from "./-components/return-equipment-form";
import { returnRequestsQuery } from "@/lib/equipment/return";
import { equipmentNamesQuery } from "@/lib/equipment";
import { EventSource } from "eventsource";
import { ReturnHeader } from "./-components/return-header";
import z from "zod";
import { ReturnTab } from "./-model";
import { ReturnRequestList } from "./-components/return-request-list";
import { ComponentLoading } from "@/components/loading";

const searchSchema = z.object({
	tab: z.enum(ReturnTab).default(ReturnTab.BorrowedItems),
	category: z.string().optional(),
	dueDateSort: z.enum(Sort).default(Sort.Desc),
});

export const Route = createFileRoute("/_authed/return/")({
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(
			borrowHistoryQuery({
				userId: context.session.user.id,
				status: BorrowRequestStatus.Approved,
				sort: Sort.Desc,
			}),
		);
		context.queryClient.ensureQueryData(
			returnRequestsQuery({ userId: context.session.user.id }),
		);
		context.queryClient.ensureQueryData(equipmentNamesQuery());
	},
	validateSearch: searchSchema,
});

function RouteComponent(): JSX.Element {
	const search = useSearch({ from: "/_authed/return/" });
	const auth = useAuth();

	// NOTE: Naive way to make sure the available options in equipment names are
	// only the equipments included in the history
	const borrowHistoryAllCategory = useQuery(
		borrowHistoryQuery({
			userId: auth.user?.id,
			status: BorrowRequestStatus.Approved,
			sort: search.dueDateSort,
		}),
	);
	const equipmentNames = borrowHistoryAllCategory.data?.flatMap((history) =>
		history.equipments.map((eq) => eq.name),
	);

	const queryClient = useQueryClient();

	useEffect(() => {
		const eventSource = new EventSource(`${BACKEND_URL}/events`);

		function handleEvent(_: MessageEvent): void {
			queryClient.ensureQueryData(
				borrowHistoryQuery({
					userId: auth.user?.id,
					status: BorrowRequestStatus.Approved,
					sort: search.dueDateSort,
					category: search.category,
				}),
			);
			queryClient.ensureQueryData(
				returnRequestsQuery({ userId: auth.user?.id }),
			);
		}

		eventSource.addEventListener("equipment:create", handleEvent);

		return () => {
			eventSource.removeEventListener("equipment:create", handleEvent);
			eventSource.close();
		};
	}, [queryClient]);

	return (
		<div className="space-y-4">
			<ReturnHeader equipmentNames={equipmentNames || []} />

			{search.tab === ReturnTab.BorrowedItems ? (
				<BorrowedItemsTab />
			) : (
				<ReturnRequestListTab />
			)}
		</div>
	);
}

function BorrowedItemsTab(): JSX.Element {
	const search = useSearch({ from: "/_authed/return/" });
	const auth = useAuth();
	const borrowHistory = useQuery(
		borrowHistoryQuery({
			userId: auth.user?.id,
			status: BorrowRequestStatus.Approved,
			sort: search.dueDateSort,
			category: search.category,
		}),
	);

	if (borrowHistory.isLoading) {
		return <ComponentLoading />;
	}

	return <ReturnEquipmentForm transactions={borrowHistory.data || []} />;
}

function ReturnRequestListTab(): JSX.Element {
	const search = useSearch({ from: "/_authed/return/" });
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

	return <ReturnRequestList returnRequests={returnRequests.data || []} />;
}
