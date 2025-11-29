import {
	returnRequestByOtpQuery,
	returnRequestsQuery,
	type ReturnRequest,
} from "@/lib/equipment/return";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type JSX } from "react";
import { Drawer } from "@/components/ui/drawer";
import { BACKEND_URL } from "@/lib/api";
import { H2 } from "@/components/typography";
import { EventSource } from "eventsource";
import QrScanner from "qr-scanner";
import { Failed } from "@/components/failed";
import {
	borrowRequestByOtpQuery,
	type BorrowTransaction,
} from "@/lib/equipment/borrow";
import { Borrow } from "./-components/borrow";
import { Return } from "./-components/return";

export const Route = createFileRoute("/_authed/scan/")({
	component: RouteComponent,
});

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
						// Transparent 1x1 poster
						poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
					/>
				</div>
				<span className="absolute left-0 top-0 size-9 border-l-4 border-t-4 border-secondary rounded-tl-4xl"></span>
				<span className="absolute right-0 top-0 size-9 border-r-4 border-t-4 border-secondary rounded-tr-4xl"></span>
				<span className="absolute left-0 bottom-0 size-9 border-l-4 border-b-4 border-secondary rounded-bl-4xl"></span>
				<span className="absolute right-0 bottom-0 size-9 border-r-4 border-b-4 border-secondary rounded-br-4xl"></span>
			</div>

			<Scanner videoRef={videoRef} />
		</div>
	);
}

type ScannerProps = {
	videoRef: React.RefObject<HTMLVideoElement | null>;
};

function Scanner({ videoRef }: ScannerProps) {
	const [borrowRequest, setBorrowRequest] = useState<BorrowTransaction | null>(
		null,
	);
	const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(
		null,
	);
	const [scanError, setScanError] = useState(false);
	const scannerRef = useRef<QrScanner | null>(null);
	const queryClient = useQueryClient();

	async function handleScan() {
		if (!videoRef.current) return;

		setScanError(false);

		scannerRef.current = new QrScanner(
			videoRef.current,
			async (result) => {
				try {
					if (result.data[0] === "B") {
						const request = await queryClient.fetchQuery(
							borrowRequestByOtpQuery(result.data),
						);
						setBorrowRequest(request);
					} else {
						const request = await queryClient.fetchQuery(
							returnRequestByOtpQuery(result.data),
						);
						setReturnRequest(request);
					}

					scannerRef.current?.stop();
				} catch (error) {
					console.error(error);
					setScanError(true);
				}
			},
			{
				calculateScanRegion: (video) => ({
					x: 0,
					y: 0,
					width: video.videoWidth,
					height: video.videoHeight,
				}),
				preferredCamera: "environment",
				maxScansPerSecond: 3,
				highlightCodeOutline: true,
			},
		);

		await scannerRef.current.start();
	}

	function resetState(): void {
		setBorrowRequest(null);
		setReturnRequest(null);
		setScanError(false);
	}

	useEffect(() => {
		if (!borrowRequest && !returnRequest && !scanError) {
			handleScan();
		}
		return () => {
			scannerRef.current?.stop();
			scannerRef.current?.destroy();
			scannerRef.current = null;
		};
	}, [borrowRequest, returnRequest, scanError]);

	if (scanError) {
		return (
			<Failed
				backLink="/scan"
				fn={resetState}
				header="Failed to scan QR code."
			/>
		);
	}

	return (
		<Drawer
			open={borrowRequest !== null || returnRequest !== null}
			onOpenChange={resetState}
		>
			{borrowRequest && (
				<Borrow transaction={borrowRequest} reset={resetState} />
			)}
			{returnRequest && <Return request={returnRequest} reset={resetState} />}
		</Drawer>
	);
}
