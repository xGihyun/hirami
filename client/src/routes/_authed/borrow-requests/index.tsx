import { borrowRequestsQuery } from "@/lib/equipment/borrow";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

export const Route = createFileRoute("/_authed/borrow-requests/")({
	component: RouteComponent,
	loader: ({ context }) => {
		return context.queryClient.ensureQueryData(borrowRequestsQuery);
	},
});

function RouteComponent(): JSX.Element {
	const { data } = useSuspenseQuery(borrowRequestsQuery);

	return (
		<div className="px-4 lg:px-10 py-5">
			<h1 className="text-4xl font-bold mb-10">Borrow Requests</h1>

			<div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
				{data.map((request) => {
					const borrowerInitials = `${request.borrower.firstName[0]}${request.borrower.lastName[0]}`;
					const borrowerName = `${request.borrower.lastName}, ${request.borrower.firstName}`;
                    const requestedAt = format(request.createdAt, "MMM d, yyyy - hh:mm:ss a")
					return (
						<div key={request.id} className="border rounded p-4">
							<Avatar>
								<AvatarImage src={request.borrower.avatarUrl} />
								<AvatarFallback>{borrowerInitials}</AvatarFallback>
							</Avatar>

							<p>{borrowerName}</p>
							<p>{requestedAt}</p>

							{request.equipments.map((equipment) => (
								<div key={equipment.equipmentTypeId} className="flex gap-1">
									<div>{equipment.quantity} pcs.</div>
									<div>
										{equipment.name} {equipment.brand} {equipment.model}
									</div>
								</div>
							))}
						</div>
					);
				})}
			</div>
		</div>
	);
}
