import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import {
	scan,
	Format,
	requestPermissions,
} from "@tauri-apps/plugin-barcode-scanner";
import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";

export const Route = createFileRoute("/_authed/barcode/")({
	component: RouteComponent,
});

function RouteComponent() {
	const [value, setValue] = useState("");
	const [isScanning, setIsScanning] = useState(false);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const scannerRef = useRef<QrScanner | null>(null);

	async function handleScan() {
		try {
			const perm = await requestPermissions();
			console.log("Permission:", perm);

			const result = await scan({ formats: [Format.QRCode] });

			console.log(result);
			setValue(result.content);
		} catch (error) {
			console.error("Error:", JSON.stringify(error, null, 2));
		}
	}

	async function handleBrowserScan() {
		if (!videoRef.current) {
			console.error("No video ref");
			return;
		}

		setIsScanning(true);

		scannerRef.current = new QrScanner(
			videoRef.current!,
			(result) => {
				console.log("Decoded:", result);
				setValue(result.data);
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
		return () => {
			if (!scannerRef.current) {
				return;
			}

			scannerRef.current.destroy();
			scannerRef.current = null;
		};
	}, []);

	return (
		<div className="h-full flex flex-col gap-2">
			<p>Value: {value}</p>
			<Button onClick={handleScan}>Native Scan</Button>

			{!isScanning ? (
				<Button onClick={handleBrowserScan}>Browser Scan</Button>
			) : (
				<Button onClick={handleScannerStop}>Stop Browser Scan</Button>
			)}

			<div className="relative h-full w-full aspect-[3/4]">
				<video
					ref={videoRef}
					className="h-full w-full absolute insert-0 object-cover"
				/>
			</div>
		</div>
	);
}
