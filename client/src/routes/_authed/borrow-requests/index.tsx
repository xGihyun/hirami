import {
	borrowRequestsQuery,
	BorrowRequestStatus,
	type BorrowTransaction,
	type ReviewBorrowRequest,
	type ReviewBorrowResponse,
    type UpdateBorrowResponse,
} from "@/lib/equipment/borrow";
import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type JSX } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import {
	BACKEND_URL,
	SHOW_ANOMALY,
	toImageUrl,
	type ApiResponse,
} from "@/lib/api";
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
import { QRCodeSVG } from "qrcode.react";
import { Success } from "@/components/success";
import { Failed } from "@/components/failed";

export const Route = createFileRoute("/_authed/borrow-requests/")({
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.prefetchQuery(borrowRequestsQuery);
	},
});

async function reviewBorrowRequest(
	value: ReviewBorrowRequest,
): Promise<ApiResponse<ReviewBorrowResponse>> {
	const response = await fetch(`${BACKEND_URL}/review-borrow-requests`, {
		method: "PATCH",
		body: JSON.stringify(value),
		headers: {
			"Content-Type": "application/json",
		},
	});

	const result: ApiResponse<ReviewBorrowResponse> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result;
}

function RouteComponent(): JSX.Element {
	const borrowRequests = useQuery(borrowRequestsQuery);
	const [selectedRequest, setSelectedRequest] = useState<
		BorrowTransaction | undefined
	>(undefined);
	const queryClient = useQueryClient();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [remarks, setRemarks] = useState<string>("");
	const [reviewedBorrowRequest, setReviewedBorrowRequest] =
		useState<ReviewBorrowResponse | null>(null);
	const [isReceived, setIsReceived] = useState(false);

	const mutation = useMutation({
		mutationFn: reviewBorrowRequest,
		onSuccess: (data) => {
			queryClient.invalidateQueries(borrowRequestsQuery);
			setReviewedBorrowRequest(data.data);
			setRemarks("");
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

		function handleBorrowRequestEvent(e: MessageEvent): void {
			const res: UpdateBorrowResponse = JSON.parse(e.data);
			setIsReceived(res.status.code === BorrowRequestStatus.Claimed);
		}

		eventSource.addEventListener("equipment:create", handleEvent);
		eventSource.addEventListener(
			"borrow-request:update",
			handleBorrowRequestEvent,
		);

		return () => {
			eventSource.removeEventListener("equipment:create", handleEvent);
			eventSource.removeEventListener(
				"borrow-request:update",
				handleBorrowRequestEvent,
			);
			eventSource.close();
		};
	}, []);

	function handleDrawerClose(): void {
		setIsDrawerOpen(false);
		setRemarks("");
		setReviewedBorrowRequest(null);
		setSelectedRequest(undefined);
		setIsReceived(false);
	}

	function reset(): void {
		handleDrawerClose();
		mutation.reset();
	}

	// if (isReceived) {
	// 	return (
	// 		<Success
	// 			fn={reset}
	// 			header="Request approved successfully."
	// 			backLink="/borrow-requests"
	// 		/>
	// 	);
	// }

	if (mutation.isError) {
		return (
			<Failed
				retry={() => mutation.mutate(mutation.variables)}
				fn={reset}
				header="Failed to process request."
				backLink="/borrow-requests"
				backMessage="or return to Request List"
			/>
		);
	}

	if (
		mutation.isSuccess &&
		reviewedBorrowRequest?.status.code === BorrowRequestStatus.Rejected
	) {
		return (
			<Success
				fn={reset}
				header="Request rejected successfully."
				backLink="/borrow-requests"
			/>
		);
	}

	if (mutation.isSuccess) {
		return (
			<Success
				fn={reset}
				header="Request approved successfully."
				backLink="/borrow-requests"
			/>
		);
	}

	return (
		<div className="relative space-y-4">
			<H2 className="text-center">Request List</H2>

			<Drawer
				open={isDrawerOpen}
				onOpenChange={(open) => {
					if (!open) {
						handleDrawerClose();
					} else {
						setIsDrawerOpen(open);
					}
				}}
			>
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
					{borrowRequests.data?.map((request) => {
						const borrowerInitials = `${request.borrower.firstName[0]}${request.borrower.lastName[0]}`;
						const borrowerName = `${request.borrower.firstName} ${request.borrower.lastName}`;
						const requestedAt = `${format(request.borrowedAt, "h:mm a")} at ${format(request.borrowedAt, "MM/dd/yyyy")}`;
						const anomalyResult = request.anomalyResult;
						return (
							<DrawerTrigger asChild key={request.borrowRequestId}>
								<button
									onClick={() => {
										setSelectedRequest(request);
										setReviewedBorrowRequest(null);
									}}
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

										{anomalyResult &&
										anomalyResult.isAnomaly &&
										SHOW_ANOMALY ? (
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
					{selectedRequest ? (
						<BorrowRequestReviewContent
							selectedRequest={selectedRequest}
							remarks={remarks}
							setRemarks={setRemarks}
							handleReview={handleReview}
							onClose={handleDrawerClose}
						/>
					) : (
						<div className="p-4">No request selected.</div>
					)}
				</DrawerContent>
			</Drawer>
		</div>
	);
}

type ConfirmationQrProps = {
	borrowRequestId: string;
};

function ConfirmationQr(props: ConfirmationQrProps): JSX.Element {
	return (
		<div className="text-center space-y-4 p-4 h-full flex flex-col justify-center items-center">
			<DrawerTitle className="items-center flex flex-col">
				Confirmation QR Code
			</DrawerTitle>
			<LabelSmall className="max-w-xs mx-auto">
				Please have the borrower scan this to complete the equipment borrowing
				process.
			</LabelSmall>

			<QRCodeSVG
				value={props.borrowRequestId}
				className="size-64"
				bgColor="transparent"
			/>
		</div>
	);
}

type BorrowRequestReviewContentProps = {
	selectedRequest: BorrowTransaction;
	remarks: string;
	setRemarks: (remarks: string) => void;
	handleReview: (
		request: BorrowTransaction,
		reviewedBy: User,
		status: BorrowRequestStatus,
		remarks?: string,
	) => Promise<void>;
	onClose: () => void;
};

function BorrowRequestReviewContent(
	props: BorrowRequestReviewContentProps,
): JSX.Element {
	const auth = useAuth();
	const borrowerInitials = `${props.selectedRequest.borrower.firstName[0]}${props.selectedRequest.borrower.lastName[0]}`;
	const request = props.selectedRequest;

	return (
		<div className="h-full overflow-y-auto">
			<DrawerHeader>
				<DrawerTitle className="items-center flex flex-col">
					<Avatar className="size-16">
						<AvatarImage src={toImageUrl(request.borrower.avatarUrl)} />
						<AvatarFallback className="font-montserrat-bold">
							{borrowerInitials}
						</AvatarFallback>
					</Avatar>

					<TitleSmall>
						{request?.borrower.firstName} {request?.borrower.lastName}
					</TitleSmall>
				</DrawerTitle>

				<div className="text-muted">
					<Caption>
						Requested on {format(request.borrowedAt, "MMMM d, yyyy - hh:mm a")}
					</Caption>

					<Caption>
						Will return on{" "}
						{format(request.expectedReturnAt, "MMMM d, yyyy - hh:mm a")}
					</Caption>
				</div>
			</DrawerHeader>

			<div className="px-4 space-y-2.5 mb-4">
				{request.equipments.map((equipment) => {
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

								<LabelSmall className="text-muted">{equipment.name}</LabelSmall>

								<Caption className="font-open-sans-bold">
									{equipment.quantity} pcs.
								</Caption>
							</div>
						</div>
					);
				})}
			</div>

			<div className="px-4 space-y-2.5">
				<div className="space-y-1">
					<LabelMedium>Location</LabelMedium>
					<Input value={request.location} readOnly />
				</div>

				<div className="space-y-1">
					<LabelMedium>Purpose</LabelMedium>
					<Input value={request.purpose} readOnly />
				</div>

				<div className="space-y-1">
					<LabelMedium>Remarks</LabelMedium>
					<Textarea
						className="min-h-24"
						placeholder="Add your remarks here"
						onChange={(v) => props.setRemarks(v.currentTarget.value)}
						value={props.remarks}
					/>
				</div>
			</div>

			<DrawerFooter>
				<div className="flex w-full gap-2">
					<Button
						className="flex-1"
						onClick={() => {
							if (!auth.user) {
								toast.error("Please log in to review borrow request");
								return;
							}
							props.handleReview(
								request,
								auth.user,
								BorrowRequestStatus.Approved,
								props.remarks,
							);
						}}
					>
						Accept
					</Button>

					<Button
						className="flex-1"
						onClick={() => {
							if (!auth.user) {
								toast.error("Please log in to review borrow request");
								return;
							}
							props.handleReview(
								request,
								auth.user,
								BorrowRequestStatus.Rejected,
								props.remarks,
							);
						}}
						variant="destructive"
					>
						Reject
					</Button>
				</div>

				<DrawerClose asChild>
					<Button variant="secondary" onClick={props.onClose}>
						Close
					</Button>
				</DrawerClose>
			</DrawerFooter>
		</div>
	);
}
