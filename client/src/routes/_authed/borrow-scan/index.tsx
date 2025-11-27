import { H2 } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { BACKEND_URL, type ApiResponse } from "@/lib/api";
import { BorrowRequestStatus } from "@/lib/equipment/borrow";
import { createFileRoute } from "@tanstack/react-router";
import QrScanner from "qr-scanner";
import { useEffect, useRef, useState, type JSX } from "react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

type UpdateBorrowRequest = {
	id: string;
	status: BorrowRequestStatus;
};

async function updateBorrowRequest(
	value: UpdateBorrowRequest,
): Promise<ApiResponse<UpdateBorrowRequest>> {
	const response = await fetch(`${BACKEND_URL}/borrow-requests/${value.id}`, {
		method: "PATCH",
		body: JSON.stringify(value),
		headers: {
			"Content-Type": "application/json",
		},
	});

	const result: ApiResponse<UpdateBorrowRequest> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result;
}

export const Route = createFileRoute("/_authed/borrow-scan/")({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	const [borrowRequestId, setBorrowRequestId] = useState<string | null>(null);
	const [isScanning, setIsScanning] = useState(false);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const scannerRef = useRef<QrScanner | null>(null);

	async function handleScan() {
		if (!videoRef.current) {
			console.error("No video ref");
			return;
		}

		setIsScanning(true);

		scannerRef.current = new QrScanner(
			videoRef.current!,
			(result) => {
				setBorrowRequestId(result.data);
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

	const mutation = useMutation({
		mutationFn: updateBorrowRequest,
		onSuccess: () => {
			setBorrowRequestId(null);
		},
	});

	function handleConfirmation(id: string): void {
		mutation.mutate({
			id: id,
			status: BorrowRequestStatus.Claimed,
		});
	}

	useEffect(() => {
		return () => {
			if (!scannerRef.current) {
				return;
			}

			scannerRef.current.destroy();
			scannerRef.current = null;
		};
	}, []);

	return (
		<div className="relative space-y-4 pb-15 !mb-0">
			<H2 className="text-center">Confirm Borrow Request</H2>

			<div className="relative h-full w-full aspect-[3/4]">
				<video
					ref={videoRef}
					className="h-full w-full absolute insert-0 object-cover"
				/>
			</div>

			{!isScanning ? (
				<Button
					className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 left-4 z-50"
					onClick={handleScan}
				>
					Scan
				</Button>
			) : (
				<Button
					className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 left-4 z-50"
					onClick={handleScannerStop}
				>
					Stop Scanning
				</Button>
			)}

			<Dialog
				open={borrowRequestId !== null}
				onOpenChange={(open) => {
					if (!open) {
						setBorrowRequestId(null);
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm Received Equipments</DialogTitle>
						<DialogDescription>
							By confirming, you acknowledge that you have received all the
							requested equipment associated with this borrow request.
						</DialogDescription>
					</DialogHeader>

					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="secondary">
								Cancel
							</Button>
						</DialogClose>

						<Button
							onClick={() => {
								if (!borrowRequestId) {
									alert("No borrow request selected");
									return;
								}

								handleConfirmation(borrowRequestId);
							}}
						>
							Confirm
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
