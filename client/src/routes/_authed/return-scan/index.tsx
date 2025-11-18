import {
	returnRequestByIdQuery,
	returnRequestsQuery,
	type ConfirmReturnRequest,
	type ReturnRequest,
} from "@/lib/equipment/return";
import {
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type JSX } from "react";
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
} from "@/components/ui/drawer";
import { BACKEND_URL, toImageUrl, type ApiResponse } from "@/lib/api";
import { Caption, H2, P } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth";
import type { User } from "@/lib/user";
import { EventSource } from "eventsource";
import QrScanner from "qr-scanner";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authed/return-scan/")({
	component: RouteComponent,
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
	const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(
		null,
	);
	const [isScanning, setIsScanning] = useState(false);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const scannerRef = useRef<QrScanner | null>(null);
	const auth = useAuth();
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: confirmReturnRequest,
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

	async function handleScan() {
		if (!videoRef.current) {
			console.error("No video ref");
			return;
		}

		setIsScanning(true);

		scannerRef.current = new QrScanner(
			videoRef.current!,
			async (result) => {
				const returnRequest = await queryClient.fetchQuery(
					returnRequestByIdQuery(result.data),
				);
				setSelectedRequest(returnRequest);
				handleScannerStop();
			},
			{
				calculateScanRegion: (video) => ({
					x: (video.videoWidth - 250) / 2,
					y: (video.videoHeight - 250) / 2,
					width: 250,
					height: 250,
					downScaledWidth: 200,
					downScaledHeight: 200,
				}),
				preferredCamera: "environment",
				maxScansPerSecond: 5,
				highlightCodeOutline: true,
				highlightScanRegion: true,
			},
		);

		await scannerRef.current.start();
	}

	function handleScannerStop() {
		if (!scannerRef.current) {
			return;
		}
		scannerRef.current.stop();
		scannerRef.current.destroy();
		setIsScanning(false);
	}

	useEffect(() => {
		handleScan();

		return () => {
			if (!scannerRef.current) {
				return;
			}

			scannerRef.current.destroy();
			scannerRef.current = null;
		};
	}, []);

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
	}, []);

	return (
		<div className="relative space-y-4 flex w-full items-center justify-center flex-col ">
			<H2 className="text-center">Scan QR Code</H2>

			<div className="relative w-full aspect-square">
				<div className="relative w-full aspect-square bg-accent rounded-4xl overflow-clip">
					<video
						ref={videoRef}
						className="w-full absolute inset-0 object-cover aspect-square"
					/>
				</div>

				{/* Top-left corner */}
				<span className="absolute left-0 top-0 size-9 border-l-4 border-t-4 border-secondary rounded-tl-4xl"></span>
				{/* Top-right corner */}
				<span className="absolute right-0 top-0 size-9 border-r-4 border-t-4 border-secondary rounded-tr-4xl"></span>
				{/* Bottom-left corner */}
				<span className="absolute left-0 bottom-0 size-9 border-l-4 border-b-4 border-secondary rounded-bl-4xl"></span>
				{/* Bottom-right corner */}
				<span className="absolute right-0 bottom-0 size-9 border-r-4 border-b-4 border-secondary rounded-br-4xl"></span>
			</div>

			<Drawer
				open={selectedRequest !== null}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedRequest(null);
					}
				}}
			>
				<DrawerContent className="space-y-4 h-full">
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
										<div className="flex flex-col gap-2 w-full">
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

											<Input placeholder="Add remarks here or something" />
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
						<DrawerClose asChild onClick={() => setSelectedRequest(null)}>
							<Button variant="outline">Close</Button>
						</DrawerClose>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</div>
	);
}
