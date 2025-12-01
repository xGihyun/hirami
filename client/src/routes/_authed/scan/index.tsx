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
import { Caption, H2, LabelLarge } from "@/components/typography";
import { EventSource } from "eventsource";
import QrScanner from "qr-scanner";
import { Failed } from "@/components/failed";
import {
	borrowRequestByOtpQuery,
	type BorrowTransaction,
} from "@/lib/equipment/borrow";
import { Borrow } from "./-components/borrow";
import { Return } from "./-components/return";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
	otp: z.string().max(7),
});

type FormSchema = z.infer<typeof formSchema>;

export const Route = createFileRoute("/_authed/scan/")({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const queryClient = useQueryClient();
	const [borrowRequest, setBorrowRequest] = useState<BorrowTransaction | null>(
		null,
	);
	const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(
		null,
	);
	const scannerRef = useRef<QrScanner | null>(null);

	const form = useForm<FormSchema>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			otp: "",
		},
	});

	async function onSubmit(value: FormSchema): Promise<void> {
		if (value.otp[0] === "B") {
			const request = await queryClient.fetchQuery(
				borrowRequestByOtpQuery(value.otp),
			);
			setBorrowRequest(request);
		} else {
			const request = await queryClient.fetchQuery(
				returnRequestByOtpQuery(value.otp),
			);
			setReturnRequest(request);
		}

		form.reset();
	}

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
		<main className="relative space-y-4 flex w-full items-center justify-center flex-col">
			<H2 className="text-center">Scan QR Code</H2>

			<section className="relative w-full aspect-square">
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
			</section>

			<Scanner
				videoRef={videoRef}
				borrowRequest={borrowRequest}
				setBorrowRequest={setBorrowRequest}
				returnRequest={returnRequest}
				setReturnRequest={setReturnRequest}
				scannerRef={scannerRef}
			/>

			<section className="space-y-2 w-full">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="otp"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-center mx-auto">
										Or enter the code (e.g. B123456)
									</FormLabel>

									<FormControl>
										<InputOTP
											inputMode="text"
											maxLength={7}
											pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
											containerClassName="justify-center"
											{...field}
										>
											<InputOTPGroup>
												<InputOTPSlot index={0} />
											</InputOTPGroup>

											<InputOTPSeparator />

											<InputOTPGroup>
												<InputOTPSlot index={1} />
												<InputOTPSlot index={2} />
												<InputOTPSlot index={3} />
												<InputOTPSlot index={4} />
												<InputOTPSlot index={5} />
												<InputOTPSlot index={6} />
											</InputOTPGroup>
										</InputOTP>
									</FormControl>

									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type="submit" className="w-full">
							Submit
						</Button>
					</form>
				</Form>
			</section>
		</main>
	);
}

type ScannerProps = {
	videoRef: React.RefObject<HTMLVideoElement | null>;
	borrowRequest: BorrowTransaction | null;
	setBorrowRequest: React.Dispatch<
		React.SetStateAction<BorrowTransaction | null>
	>;
	returnRequest: ReturnRequest | null;
	setReturnRequest: React.Dispatch<React.SetStateAction<ReturnRequest | null>>;
	scannerRef: React.RefObject<QrScanner | null>;
};

function Scanner(props: ScannerProps) {
	const [scanError, setScanError] = useState(false);
	// const scannerRef = useRef<QrScanner | null>(null);
	const queryClient = useQueryClient();

	async function handleScan() {
		if (!props.videoRef.current) return;

		setScanError(false);

		props.scannerRef.current = new QrScanner(
			props.videoRef.current,
			async (result) => {
				try {
					if (result.data[0] === "B") {
						const request = await queryClient.fetchQuery(
							borrowRequestByOtpQuery(result.data),
						);
						props.setBorrowRequest(request);
					} else {
						const request = await queryClient.fetchQuery(
							returnRequestByOtpQuery(result.data),
						);
						props.setReturnRequest(request);
					}

					props.scannerRef.current?.stop();
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

		await props.scannerRef.current.start();
	}

	function resetState(): void {
		props.setBorrowRequest(null);
		props.setReturnRequest(null);
		setScanError(false);
	}

	useEffect(() => {
		if (!props.borrowRequest && !props.returnRequest && !scanError) {
			handleScan();
		}
		return () => {
			props.scannerRef.current?.stop();
			props.scannerRef.current?.destroy();
			props.scannerRef.current = null;
		};
	}, [props.borrowRequest, props.returnRequest, scanError]);

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
			open={props.borrowRequest !== null || props.returnRequest !== null}
			onOpenChange={resetState}
		>
			{props.borrowRequest && (
				<Borrow transaction={props.borrowRequest} reset={resetState} />
			)}
			{props.returnRequest && (
				<Return request={props.returnRequest} reset={resetState} />
			)}
		</Drawer>
	);
}
