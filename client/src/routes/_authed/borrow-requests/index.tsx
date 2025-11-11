import {
	borrowRequestsQuery,
	BorrowRequestStatus,
	type BorrowRequest,
	type ReviewBorrowRequest,
} from "@/lib/equipment/borrow";
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
import { Caption, H2, P } from "@/components/typography";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/auth";
import type { User } from "@/lib/user";
import { EmptyState } from "@/components/empty";
import { EventSource } from "eventsource";

export const Route = createFileRoute("/_authed/borrow-requests/")({
	component: RouteComponent,
	loader: ({ context }) => {
		return context.queryClient.ensureQueryData(borrowRequestsQuery);
	},
});

async function approveBorrowRequest(
	value: ReviewBorrowRequest,
): Promise<ApiResponse> {
	const response = await fetch(`${BACKEND_URL}/review-borrow-requests`, {
		method: "PATCH",
		body: JSON.stringify(value),
		headers: {
			"Content-Type": "application/json",
		},
	});

	const result: ApiResponse = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result;
}

function RouteComponent(): JSX.Element {
	const { data } = useSuspenseQuery(borrowRequestsQuery);
	const [selectedRequest, setSelectedRequest] = useState<BorrowRequest>();
	const auth = useAuth();
	const queryClient = useQueryClient();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	const mutation = useMutation({
		mutationFn: approveBorrowRequest,
		onMutate: () => {
			return toast.loading("Reviewing borrow request");
		},
		onSuccess: (data, _variables, toastId) => {
			queryClient.invalidateQueries(borrowRequestsQuery);
			setIsDrawerOpen(false);
			toast.success(data.message, { id: toastId });
		},
		onError: (error, _variables, toastId) => {
			toast.error(error.message, { id: toastId });
		},
	});

	async function handleReview(
		request: BorrowRequest,
		reviewedBy: User,
        status: BorrowRequestStatus,
		remarks?: string,
	): Promise<void> {
		const payload: ReviewBorrowRequest = {
			id: request.id,
			status: status,
			reviewedBy: reviewedBy.id,
			remarks: remarks,
		};

		mutation.mutate(payload);
	}

	useEffect(() => {
		const eventSource = new EventSource(`${BACKEND_URL}/events`);

		function handleEvent(_: MessageEvent): void {
			queryClient.invalidateQueries(borrowRequestsQuery);
		}

		eventSource.addEventListener("equipment:create", handleEvent);

		return () => {
			eventSource.removeEventListener("equipment:create", handleEvent);
			eventSource.close();
		};
	}, [queryClient]);

	// TODO: Implement rejecting requests

	if (data.length === 0) {
		return (
			<div className="relative space-y-4">
				<H2>Borrow Requests</H2>

				<EmptyState>
					No borrow requests yet.
					<br />
					(´｡• ᵕ •｡`)
				</EmptyState>
			</div>
		);
	}

	return (
		<div className="relative space-y-4">
			<H2>Borrow Requests</H2>

			<Separator />

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
							<br />
							Will return on{" "}
							{selectedRequest &&
								format(
									selectedRequest.expectedReturnAt,
									"MMM d, yyyy - hh:mm a",
								)}
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
											key={equipment.equipmentTypeId}
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

					<Separator />

					<div className="px-4 space-y-4">
						<div className="space-y-2">
							<Label>Location</Label>
							<Input value={selectedRequest?.location} readOnly />
						</div>

						<div className="space-y-2">
							<Label>Purpose</Label>
							<Input value={selectedRequest?.purpose} readOnly />
						</div>
					</div>

					<DrawerFooter>
						<Button
							onClick={() => {
								if (!selectedRequest) {
									alert("No borrow request selected");
									return;
								}
								if (!auth.user) {
									alert("Please log in to review borrow request");
									return;
								}
								handleReview(selectedRequest, auth.user, BorrowRequestStatus.Approved);
							}}
						>
							Approve
						</Button>

						<Button
							onClick={() => {
								if (!selectedRequest) {
									alert("No borrow request selected");
									return;
								}
								if (!auth.user) {
									alert("Please log in to review borrow request");
									return;
								}
								handleReview(selectedRequest, auth.user, BorrowRequestStatus.Rejected);
							}}
                            variant="destructive"
						>
							Reject
						</Button>

                        <Separator />

						<DrawerClose asChild>
							<Button variant="outline">Close</Button>
						</DrawerClose>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</div>
	);
}
