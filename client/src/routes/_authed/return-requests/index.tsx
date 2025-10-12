import {
	returnRequestsQuery,
	type ConfirmReturnRequest,
	type ReturnRequest,
} from "@/lib/equipment/return";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type JSX } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { BACKEND_URL, toImageUrl, type ApiResponse } from "@/lib/api";
import { Caption, P } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/auth";
import type { User } from "@/lib/user";
import { EmptyState } from "@/components/empty";
import { EventSource } from "eventsource";

export const Route = createFileRoute("/_authed/return-requests/")({
	component: RouteComponent,
	loader: ({ context }) => {
		return context.queryClient.ensureQueryData(returnRequestsQuery({}));
	},
});

async function confirmReturnRequest(
	value: ConfirmReturnRequest,
): Promise<ApiResponse> {
	const response = await fetch(
		`${BACKEND_URL}/return-requests/${value.returnRequestId}`,
		{
			method: "PATCH",
			body: JSON.stringify(value),
			headers: {
				"Content-Type": "application/json",
			},
		},
	);

	const result: ApiResponse = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result;
}

function RouteComponent(): JSX.Element {
	const { data } = useSuspenseQuery(returnRequestsQuery({}));
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [selectedRequest, setSelectedRequest] = useState<ReturnRequest>();
	const auth = useAuth();
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: confirmReturnRequest,
		onMutate: () => {
			return toast.loading("Confirming return request");
		},
		onSuccess: (data, _variables, toastId) => {
			queryClient.invalidateQueries(returnRequestsQuery({}));
			setIsDrawerOpen(false);
			toast.success(data.message, { id: toastId });
		},
		onError: (error, _variables, toastId) => {
			toast.error(error.message, { id: toastId });
		},
	});

	async function handleConfirmation(
		request: ReturnRequest,
		reviewedBy: User,
	): Promise<void> {
		const payload: ConfirmReturnRequest = {
			returnRequestId: request.id,
			reviewedBy: reviewedBy.id,
		};

		mutation.mutate(payload);
	}

	useEffect(() => {
		const eventSource = new EventSource(`${BACKEND_URL}/events`);

		function handleEvent(_: MessageEvent): void {
			queryClient.invalidateQueries(returnRequestsQuery({}));
		}

		eventSource.addEventListener("equipment:create", handleEvent);

		return () => {
			eventSource.removeEventListener("equipment:create", handleEvent);
			eventSource.close();
		};
	}, [queryClient]);

	if (data.length === 0) {
		return (
			<div className="relative space-y-4">
				<p className="font-montserrat-medium text-sm mb-1">Return Requests</p>

				<EmptyState>
					No return requests yet.
					<br />
					(´｡• ᵕ •｡`)
				</EmptyState>
			</div>
		);
	}

	return (
		<div className="relative space-y-4">
			<p className="font-montserrat-medium text-sm mb-1">Return Requests</p>

			<Drawer
				open={isDrawerOpen}
				onOpenChange={(open) => setIsDrawerOpen(open)}
			>
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
					{data.map((request) => {
						const borrowerInitials = `${request.borrower.firstName[0]}${request.borrower.lastName[0]}`;
						const borrowerName = `${request.borrower.lastName}, ${request.borrower.firstName}`;
						const requestedAt = format(
							request.createdAt,
							"MMM d, yyyy - hh:mm a",
						);
						return (
							<DrawerTrigger asChild key={request.id}>
								<button
									onClick={() => setSelectedRequest(request)}
									className="border rounded p-4 text-start bg-card cursor-pointer hover:bg-card/50 transition-colors flex gap-2 items-center"
								>
									<Avatar className="size-12">
										<AvatarImage src={toImageUrl(request.borrower.avatarUrl)} />
										<AvatarFallback className="font-montserrat-bold">
											{borrowerInitials}
										</AvatarFallback>
									</Avatar>

									<div className="flex flex-col">
										<p className="font-montserrat-bold">{borrowerName}</p>
										<p className="text-sm font-montserrat-medium">
											{requestedAt}
										</p>
									</div>
								</button>
							</DrawerTrigger>
						);
					})}
				</div>

				<DrawerContent className="space-y-4">
					<DrawerHeader>
						<DrawerTitle className="items-center flex flex-col">
							<Avatar className="size-12">
								<AvatarImage
									src={toImageUrl(selectedRequest?.borrower.avatarUrl)}
								/>
								<AvatarFallback className="font-montserrat-bold">
									{selectedRequest?.borrower.firstName[0]}
									{selectedRequest?.borrower.lastName[0]}
								</AvatarFallback>
							</Avatar>

							<P>
								{selectedRequest?.borrower.firstName}{" "}
								{selectedRequest?.borrower.lastName}
							</P>
						</DrawerTitle>
						<DrawerDescription>
							Requested on{" "}
							{selectedRequest &&
								format(selectedRequest.createdAt, "MMM d, yyyy - hh:mm a")}
						</DrawerDescription>
					</DrawerHeader>

					{selectedRequest && (
						<div className="px-4 py-4 flex-1 overflow-y-auto">
							<div className="divide-y">
								{selectedRequest.equipments.map((equipment) => {
									const equipmentImage = equipment.imageUrl
										? `${BACKEND_URL}${equipment.imageUrl}`
										: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

									return (
										<div
											key={equipment.id}
											className="flex items-center gap-2 justify-between py-2"
										>
											<div className="flex items-center gap-2 w-full">
												<img
													src={equipmentImage}
													alt={`${equipment.name} ${equipment.brand}`}
													className="size-20 object-cover"
												/>

												<div className="flex flex-col">
													<p className="font-montserrat-semibold text-base leading-6">
														{equipment.name}
													</p>

													<Caption>
														{equipment.brand}
														{equipment.model ? " - " : null}
														{equipment.model}
													</Caption>
												</div>
											</div>

											<div className="flex items-center gap-1">
												<p className="font-montserrat-bold text-lg">
													{equipment.quantity}
												</p>
												<Caption>pcs.</Caption>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					<DrawerFooter>
						<Button
							onClick={() => {
								if (!selectedRequest) {
									alert("No return request selected");
									return;
								}
								if (!auth.user) {
									alert("Please log in to confirm return request");
									return;
								}
								handleConfirmation(selectedRequest, auth.user);
							}}
						>
							Confirm
						</Button>
						<DrawerClose asChild>
							<Button variant="outline">Close</Button>
						</DrawerClose>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</div>
	);
}
