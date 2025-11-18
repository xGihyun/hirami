import {
	borrowRequestsQuery,
	BorrowRequestStatus,
	type BorrowTransaction,
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
import {
	Caption,
	H2,
	LabelLarge,
	LabelMedium,
	LabelSmall,
	TitleSmall,
} from "@/components/typography";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/auth";
import type { User } from "@/lib/user";
import { EventSource } from "eventsource";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/_authed/borrow-requests/")({
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.prefetchQuery(borrowRequestsQuery);
	},
});

async function reviewBorrowRequest(
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
	const [selectedRequest, setSelectedRequest] = useState<BorrowTransaction>();
	const auth = useAuth();
	const queryClient = useQueryClient();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [remarks, setRemarks] = useState<string>("");

	const mutation = useMutation({
		mutationFn: reviewBorrowRequest,
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
		request: BorrowTransaction,
		reviewedBy: User,
		status: BorrowRequestStatus,
		remarks?: string,
	): Promise<void> {
		const payload: ReviewBorrowRequest = {
			id: request.borrowRequestId,
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

	return (
		<div className="relative space-y-4">
			<H2 className="text-center">Request List</H2>

			<Drawer
				open={isDrawerOpen}
				onOpenChange={(open) => setIsDrawerOpen(open)}
			>
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
					{data.map((request) => {
						const borrowerInitials = `${request.borrower.firstName[0]}${request.borrower.lastName[0]}`;
						const borrowerName = `${request.borrower.lastName}, ${request.borrower.firstName}`;
						const requestedAt = `${format(request.borrowedAt, "h:mm a")} at ${format(request.borrowedAt, "MM/dd/yyyy")}`;
						const anomalyResult = request.anomalyResult;
						return (
							<DrawerTrigger asChild key={request.borrowRequestId}>
								<button
									onClick={() => setSelectedRequest(request)}
									className="flex items-center gap-2 bg-card rounded-2xl p-4 shadow-item text-start cursor-pointer active:bg-tertiary hover:bg-tertiary transition"
								>
									<Avatar className="size-16">
										<AvatarImage src={toImageUrl(request.borrower.avatarUrl)} />
										<AvatarFallback className="font-montserrat-bold">
											{borrowerInitials}
										</AvatarFallback>
									</Avatar>

									<div className="flex flex-col">
										<p className="font-montserrat-bold">{borrowerName}</p>
										<p className="text-sm font-montserrat">
											<span className="font-montserrat-bold">Requested:</span>{" "}
											{requestedAt}
										</p>

										{anomalyResult && anomalyResult.isAnomaly ? (
											<Badge
												className="mt-1 mx-auto block"
												variant="destructive"
											>
												Anomaly
											</Badge>
										) : null}
									</div>
								</button>
							</DrawerTrigger>
						);
					})}
				</div>

				<DrawerContent className="space-y-4 h-full">
					<div className="h-full overflow-y-auto">
						<DrawerHeader>
							<DrawerTitle className="items-center flex flex-col">
								<Avatar className="size-16">
									<AvatarImage
										src={toImageUrl(selectedRequest?.borrower.avatarUrl)}
									/>
									<AvatarFallback className="font-montserrat-bold">
										{selectedRequest?.borrower.firstName[0]}
										{selectedRequest?.borrower.lastName[0]}
									</AvatarFallback>
								</Avatar>

								<TitleSmall>
									{selectedRequest?.borrower.firstName}{" "}
									{selectedRequest?.borrower.lastName}
								</TitleSmall>
							</DrawerTitle>
							<DrawerDescription>
								<Caption>
									Requested on{" "}
									{selectedRequest &&
										format(
											selectedRequest.borrowedAt,
											"MMMM d, yyyy - hh:mm a",
										)}
								</Caption>

								<Caption>
									Will return on{" "}
									{selectedRequest &&
										format(
											selectedRequest.expectedReturnAt,
											"MMMM d, yyyy - hh:mm a",
										)}
								</Caption>
							</DrawerDescription>
						</DrawerHeader>

						{selectedRequest && (
							<div className="p-4 space-y-2.5">
								{selectedRequest.equipments.map((equipment) => {
									const equipmentImage = equipment.imageUrl
										? `${BACKEND_URL}${equipment.imageUrl}`
										: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

									return (
										<div
											key={equipment.equipmentTypeId}
											className="flex items-center gap-3 bg-card rounded-2xl p-4 shadow-item text-start"
										>
											<img
												src={equipmentImage}
												alt={`${equipment.name} ${equipment.brand}`}
												className="size-20 object-cover rounded-lg"
											/>

											<div className="flex flex-col">
												<LabelLarge>
													{equipment.brand}
													{equipment.model ? " " : null}
													{equipment.model}
												</LabelLarge>

												<LabelSmall className="text-muted">
													{equipment.name}
												</LabelSmall>

												<Caption className="font-open-sans-bold">
													{equipment.quantity} pcs.
												</Caption>
											</div>
										</div>
									);
								})}
							</div>
						)}

						<div className="px-4 space-y-4">
							<div className="space-y-2">
								<LabelMedium>Location</LabelMedium>
								<Input value={selectedRequest?.location} readOnly />
							</div>

							<div className="space-y-2">
								<LabelMedium>Purpose</LabelMedium>
								<Input value={selectedRequest?.purpose} readOnly />
							</div>

							<div className="space-y-2">
								<LabelMedium>Remarks</LabelMedium>
								<Textarea
									className="min-h-24"
									placeholder="Add your remarks here"
									onChange={(v) => setRemarks(v.currentTarget.value)}
									value={remarks}
								/>
							</div>
						</div>

						<DrawerFooter className="mt-0">
							<div className="flex w-full gap-2">
								<Button
									className="flex-1"
									onClick={() => {
										if (!selectedRequest) {
											alert("No borrow request selected");
											return;
										}
										if (!auth.user) {
											alert("Please log in to review borrow request");
											return;
										}
										handleReview(
											selectedRequest,
											auth.user,
											BorrowRequestStatus.Approved,
										);
									}}
								>
									Accept
								</Button>

								<Button
									className="flex-1"
									onClick={() => {
										if (!selectedRequest) {
											alert("No borrow request selected");
											return;
										}
										if (!auth.user) {
											alert("Please log in to review borrow request");
											return;
										}
										handleReview(
											selectedRequest,
											auth.user,
											BorrowRequestStatus.Rejected,
											remarks,
										);
									}}
									variant="destructive"
								>
									Reject
								</Button>
							</div>

							<DrawerClose asChild>
								<Button variant="secondary" onClick={() => setRemarks("")}>
									Close
								</Button>
							</DrawerClose>
						</DrawerFooter>
					</div>
				</DrawerContent>
			</Drawer>
		</div>
	);
}
