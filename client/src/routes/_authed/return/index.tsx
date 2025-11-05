import { useAuth } from "@/auth";
import { BACKEND_URL, Sort } from "@/lib/api";
import {
	borrowHistoryQuery,
	type BorrowedEquipment,
} from "@/lib/equipment/borrow";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
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

const searchSchema = z.object({
	tab: z.enum(ReturnTab).default(ReturnTab.BorrowedItems),
	category: z.string().optional(),
	dueDateSort: z.enum(Sort).default(Sort.Desc),
});

export const Route = createFileRoute("/_authed/return/")({
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(
			borrowHistoryQuery({ userId: context.session.user.id }),
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
	const borrowHistory = useSuspenseQuery(
		borrowHistoryQuery({
			userId: auth.user?.id,
		}),
	);
	const returnRequests = useSuspenseQuery(
		returnRequestsQuery({
			userId: auth.user?.id,
		}),
	);
	const equipmentNames = useSuspenseQuery(equipmentNamesQuery());

	const currentTransactions = borrowHistory.data.flatMap((transaction) =>
		transaction.status === "approved" ? transaction : [],
	);

	const queryClient = useQueryClient();

	useEffect(() => {
		const eventSource = new EventSource(`${BACKEND_URL}/events`);

		function handleEvent(_: MessageEvent): void {
			queryClient.ensureQueryData(
				borrowHistoryQuery({ userId: auth.user?.id }),
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
			<ReturnHeader equipmentNames={equipmentNames.data} />

			{search.tab === ReturnTab.BorrowedItems ? (
				<ReturnEquipmentForm transactions={currentTransactions} />
			) : (
				<ReturnRequestList returnRequests={returnRequests.data} />
			)}
		</div>
	);
}

export type SelectedBorrowedEquipment = {
	equipment: BorrowedEquipment;
	quantity: number;
};
