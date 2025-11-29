import {
	returnRequestByOtpQuery,
	returnRequestsQuery,
	type ConfirmReturnRequest,
	type ReturnRequest,
} from "@/lib/equipment/return";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import {
	Caption,
	H2,
	LabelLarge,
	LabelMedium,
	LabelSmall,
	P,
} from "@/components/typography";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth";
import { EventSource } from "eventsource";
import QrScanner from "qr-scanner";
import { Failed } from "@/components/failed";
import { Textarea } from "@/components/ui/textarea";
import { Success } from "@/components/success";

export const Route = createFileRoute("/_authed/_scan/return-scan/")({
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
			headers: { "Content-Type": "application/json" },
		},
	);
	const result: ApiResponse = await response.json();
	if (!response.ok) throw new Error(result.message);
	return result;
}

type ScannerProps = {
	videoRef: React.RefObject<HTMLVideoElement | null>;
};

function ReturnScan({ videoRef }: ScannerProps) {
	const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(
		null,
	);
	const [scanError, setScanError] = useState(false);
	const [remarks, setRemarks] = useState("");
	const scannerRef = useRef<QrScanner | null>(null);
	const queryClient = useQueryClient();
	const auth = useAuth();

	const mutation = useMutation({
		mutationFn: confirmReturnRequest,
	});

	async function handleScan() {
		if (!videoRef.current) return;
		setScanError(false);

		scannerRef.current = new QrScanner(
			videoRef.current,
			async (result) => {
				try {
					const request = await queryClient.fetchQuery(
						returnRequestByOtpQuery(result.data),
					);
					setSelectedRequest(request);
					scannerRef.current?.stop();
				} catch (error) {
					console.error(error);
				}
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

	useEffect(() => {
		if (!selectedRequest && !mutation.isSuccess) {
			handleScan();
		}
		// return () => {
		// 	scannerRef.current?.stop();
		// 	scannerRef.current?.destroy();
		// 	scannerRef.current = null;
		// };
	}, []);

	const resetState = () => {
		mutation.reset();
		setSelectedRequest(null);
		setScanError(false);
		setRemarks("");
	};

	if (scanError)
		return (
			<Failed
				backLink="/return-scan"
				fn={resetState}
				header="Failed to scan return request."
			/>
		);
	if (mutation.isError)
		return (
			<Failed
				backLink="/return-scan"
				header="Failed to confirm return."
				fn={resetState}
			/>
		);
	if (mutation.isSuccess)
		return (
			<Success
				backLink="/return-scan"
				header="Successfully returned equipments."
				fn={resetState}
			/>
		);

	return (
		<Drawer
			open={selectedRequest !== null}
			onOpenChange={(open) => !open && setSelectedRequest(null)}
		>
			{selectedRequest && (
				<DrawerContent className="space-y-4 h-full">
					<RequestDetailsHeader
						borrower={selectedRequest.borrower}
						date={selectedRequest.createdAt}
					/>
					<div className="px-4 py-4 overflow-y-auto space-y-4">
						<EquipmentList equipments={selectedRequest.equipments} />

						<div className="space-y-1">
							<LabelMedium>Remarks</LabelMedium>
							<Textarea
								className="min-h-24"
								placeholder="Add your remarks here"
								onChange={(v) => setRemarks(v.currentTarget.value)}
								value={remarks}
							/>
						</div>

						<DrawerFooter className="mt-0">
							<Button
								onClick={() => {
									if (!auth.user) return;
									mutation.mutate({
										returnRequestId: selectedRequest.id,
										reviewedBy: auth.user.id,
										remarks: remarks,
									});
								}}
							>
								Confirm Return
							</Button>
							<DrawerClose asChild>
								<Button variant="secondary">Close</Button>
							</DrawerClose>
						</DrawerFooter>
					</div>
				</DrawerContent>
			)}
		</Drawer>
	);
}

function RequestDetailsHeader({
	borrower,
	date,
}: {
	borrower: any;
	date: string;
}) {
	return (
		<DrawerHeader>
			<DrawerTitle className="items-center flex flex-col">
				<Avatar className="size-12">
					<AvatarImage src={toImageUrl(borrower.avatarUrl)} />
					<AvatarFallback className="font-montserrat-bold">
						{borrower.firstName[0]}
						{borrower.lastName[0]}
					</AvatarFallback>
				</Avatar>
				<P>
					{borrower.firstName} {borrower.lastName}
				</P>
			</DrawerTitle>
			<DrawerDescription>
				Requested on {format(date, "MMM d, yyyy - hh:mm a")}
			</DrawerDescription>
		</DrawerHeader>
	);
}

function EquipmentList({ equipments }: { equipments: any[] }) {
	return (
		<div>
			{equipments.map((equipment: any) => {
				const key =
					equipment.borrowRequestItemId ||
					equipment.returnRequestItemId ||
					Math.random();
				const equipmentImage =
					toImageUrl(equipment.imageUrl) ||
					"https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

				return (
					<div className="flex flex-col gap-2 w-full" key={key}>
						<div className="flex items-center gap-3 justify-between p-4 bg-card rounded-2xl shadow-item">
							<div className="flex items-center gap-2 w-full">
								<img
									src={equipmentImage}
									alt={`${equipment.name} ${equipment.brand}`}
									className="size-20 object-cover"
								/>
								<div className="flex flex-col">
									<LabelLarge>
										{equipment.brand} {equipment.model}
									</LabelLarge>
									<LabelSmall className="text-muted">
										{equipment.name}
									</LabelSmall>
									<Caption className="font-open-sans-bold">
										{equipment.quantity} pcs.
									</Caption>
								</div>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}

function RouteComponent(): JSX.Element {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const queryClient = useQueryClient();

	useEffect(() => {
		const eventSource = new EventSource(`${BACKEND_URL}/events`);
		const handleEvent = () =>
			queryClient.invalidateQueries(returnRequestsQuery({}));
		eventSource.addEventListener("equipment:create", handleEvent);
		return () => {
			eventSource.removeEventListener("equipment:create", handleEvent);
			eventSource.close();
		};
	}, []);

	return (
		<div className="relative space-y-4 flex w-full items-center justify-center flex-col">
			<H2 className="text-center">Scan QR Code</H2>

			<div className="relative w-full aspect-square">
				<div className="relative w-full aspect-square bg-accent rounded-4xl overflow-clip">
					<video
						ref={videoRef}
						className="w-full absolute inset-0 object-cover aspect-square"
						muted
						playsInline
					/>
				</div>
				<span className="absolute left-0 top-0 size-9 border-l-4 border-t-4 border-secondary rounded-tl-4xl"></span>
				<span className="absolute right-0 top-0 size-9 border-r-4 border-t-4 border-secondary rounded-tr-4xl"></span>
				<span className="absolute left-0 bottom-0 size-9 border-l-4 border-b-4 border-secondary rounded-bl-4xl"></span>
				<span className="absolute right-0 bottom-0 size-9 border-r-4 border-b-4 border-secondary rounded-br-4xl"></span>
			</div>

			<ReturnScan videoRef={videoRef} />
		</div>
	);
}
