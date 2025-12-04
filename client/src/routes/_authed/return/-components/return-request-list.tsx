import {
	Caption,
	H1,
	H2,
	LabelLarge,
	LabelSmall,
} from "@/components/typography";
import { Badge } from "@/components/ui/badge";
import { BACKEND_URL } from "@/lib/api";
import type { Equipment } from "@/lib/equipment";
import type { ReturnRequest } from "@/lib/equipment/return";
import { cn, getRemainingMs } from "@/lib/utils";
import { format } from "date-fns";
import type { JSX } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Timer } from "@ark-ui/react/timer";

type Props = {
	returnRequests: ReturnRequest[];
};

export function ReturnRequestList(props: Props): JSX.Element {
	return (
		<section className="space-y-3.5">
			{props.returnRequests.map((request) => (
				<div key={request.id} className="space-y-3.5">
					{request.equipments.map((equipment) => {
						return (
							<Dialog key={equipment.id}>
								<DialogTrigger key={equipment.id} asChild>
									<button className="w-full text-start">
										<ReturningItem
											returnRequest={request}
											equipment={equipment}
										/>
									</button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Scan QR Code</DialogTitle>
										<DialogDescription>
											Show this QR Code to the equipment manager to confirm your
											equipment return.
										</DialogDescription>
									</DialogHeader>

									<section className="space-y-8">
										<div className="space-y-2">
											<QRCodeSVG
												value={request.otp.code}
												className="size-64 mx-auto"
												bgColor="transparent"
											/>

											<H2 className="text-center">{request.otp.code}</H2>
										</div>

										<div className="mx-auto text-center content-center space-y-2">
											<Caption>Time left until OTP refreshes</Caption>

											<Timer.Root
												countdown
												autoStart
												startMs={getRemainingMs(
													new Date(request.otp.expiresAt),
												)}
											>
												<H1>
													<Timer.Area className="flex justify-center">
														<Timer.Item type="minutes" />
														<Timer.Separator>:</Timer.Separator>
														<Timer.Item type="seconds" />
													</Timer.Area>
												</H1>
											</Timer.Root>
										</div>
									</section>
								</DialogContent>
							</Dialog>
						);
					})}
				</div>
			))}
		</section>
	);
}

type ReturningItemProps = {
	returnRequest: ReturnRequest;
	equipment: Equipment;
	className?: string;
};

function ReturningItem(props: ReturningItemProps): JSX.Element {
	const equipmentImage = props.equipment.imageUrl
		? `${BACKEND_URL}${props.equipment.imageUrl}`
		: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

	return (
		<div
			className={cn(
				"flex items-center gap-2 justify-between bg-card rounded-2xl p-4 shadow-item",
				props.className,
			)}
		>
			<div className="flex items-center gap-2 w-full">
				<img
					src={equipmentImage}
					alt={`${props.equipment.name} ${props.equipment.brand}`}
					className="size-16 object-cover"
				/>

				<div className="flex flex-col w-full">
					<LabelLarge>
						{props.equipment.brand}
						{props.equipment.model ? ` ${props.equipment.model}` : null}
					</LabelLarge>

					<LabelSmall className="text-muted group-has-data-[state=checked]:text-primary-foreground">
						Due: {format(props.returnRequest.expectedReturnAt, "h:mm a")} on{" "}
						{format(props.returnRequest.expectedReturnAt, "MM/dd/yyyy")}
					</LabelSmall>

					<Badge className="mt-1" variant="warning">
						Status: pending request
					</Badge>
				</div>
			</div>

			<Badge className="mt-1">Quantity ({props.equipment.quantity})</Badge>
		</div>
	);
}
