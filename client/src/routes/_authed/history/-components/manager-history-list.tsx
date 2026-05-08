import type { BorrowRequest } from "@/lib/equipment/model";
import { useRef, useState, type JSX } from "react";
import { ManagerHistoryItem } from "./manager-history-item";
import { Link } from "@tanstack/react-router";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Caption,
	LabelLarge,
	LabelMedium,
	LabelSmall,
	TitleSmall,
} from "@/components/typography";
import { SHOW_ANOMALY, toImageUrl } from "@/lib/api";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { getFullName } from "@/lib/user/helper";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { capitalizeWords, getBorrowRequestBadgeVariant } from "@/lib/utils";

type Props = {
	history: BorrowRequest[];
};

export function ManagerHistoryList(props: Props): JSX.Element {
	const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(
		null,
	);

	// Retains the last selected value so drawer content doesn't
	// disappear mid-close-animation when selectedRequest resets to null
	const displayedRequest = useRef<BorrowRequest | null>(null);
	if (selectedRequest !== null) {
		displayedRequest.current = selectedRequest;
	}

	const req = displayedRequest.current;

	const formattedRemarks = [
		req?.review?.remarks ? `• ${req.review.remarks}` : null,
		req?.returnConfirmations?.[0]?.remarks
			? `• ${req.returnConfirmations[0].remarks}`
			: null,
	]
		.filter(Boolean)
		.join("\n");

	return (
		<section className="space-y-4">
			<Drawer
				open={selectedRequest !== null}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedRequest(null);
					}
				}}
			>
				<div className="space-y-4">
					{props.history.map((transaction) => (
						<div key={transaction.id}>
							<Link
								to="/history/$borrowRequestId"
								params={{ borrowRequestId: transaction.id }}
								className="block md:hidden"
							>
								<ManagerHistoryItem transaction={transaction} />
							</Link>
							<DrawerTrigger asChild>
								<button
									type="button"
									className="hidden md:block w-full text-start cursor-pointer"
									onClick={() => setSelectedRequest(transaction)}
								>
									<ManagerHistoryItem transaction={transaction} />
								</button>
							</DrawerTrigger>
						</div>
					))}
				</div>

				<DrawerContent
					className="space-y-4 h-full"
					onCloseAutoFocus={(e) => e.preventDefault()}
				>
					<div className="h-full overflow-y-auto md:max-w-sm w-full mx-auto">
						<DrawerHeader>
							<DrawerTitle className="items-center flex flex-col">
								<Avatar className="size-16">
									<AvatarImage src={toImageUrl(req?.borrower.avatarUrl)} />
									<AvatarFallback className="font-montserrat-bold">
										{req?.borrower.firstName[0]} {req?.borrower.lastName[0]}
									</AvatarFallback>
								</Avatar>
								<TitleSmall>
									{req?.borrower.firstName} {req?.borrower.lastName}
								</TitleSmall>

								{req && (
									<Badge
										className="my-3"
										variant={getBorrowRequestBadgeVariant(req.status.code)}
									>
										Status: {capitalizeWords(req.status.code)}
									</Badge>
								)}
							</DrawerTitle>

							<div>
								<Caption className="text-muted">
									Requested on{" "}
									{req && format(req.requestedAt, "MMMM d, yyyy - hh:mm a")}
								</Caption>
								<Caption className="text-muted">
									Will return on{" "}
									{req &&
										format(req.expectedReturnAt, "MMMM d, yyyy - hh:mm a")}
								</Caption>

								{req?.actualReturnAt && (
									<Caption className="text-muted">
										Returned on{" "}
										{format(req.actualReturnAt, "MMMM d, yyyy - hh:mm a")}
									</Caption>
								)}

								{req?.review?.reviewedBy && (
									<Caption className="text-muted">
										Borrow confirmed by: {getFullName(req.review.reviewedBy)}
									</Caption>
								)}

								{req?.returnConfirmations[0]?.confirmedBy && (
									<Caption className="text-muted">
										Return processed by:{" "}
										{getFullName(req?.returnConfirmations[0].confirmedBy)}
									</Caption>
								)}

								{req?.anomaly?.isAnomaly && SHOW_ANOMALY && (
									<Badge className="mt-1" variant="destructive">
										Anomaly
									</Badge>
								)}
							</div>
						</DrawerHeader>

						<div className="px-4 space-y-2.5 mb-4">
							{req?.requestedItems.map(({ id, equipment }) => {
								const equipmentImage = toImageUrl(equipment.imageUrl);

								return (
									<div
										key={id}
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

						<div className="px-4 space-y-2.5">
							<div className="space-y-1">
								<LabelMedium>Location</LabelMedium>
								<Input value={req?.location} readOnly />
							</div>

							<div className="space-y-1">
								<LabelMedium>Purpose</LabelMedium>
								<Input value={req?.purpose} readOnly />
							</div>

							<div className="space-y-1">
								<LabelMedium>Remarks</LabelMedium>
								<Textarea
									className="min-h-24"
									value={formattedRemarks}
									readOnly
								/>
							</div>
						</div>

						<DrawerFooter>
							<DrawerClose asChild>
								<Button
									variant="default"
									onClick={() => setSelectedRequest(null)}
								>
									Close
								</Button>
							</DrawerClose>
						</DrawerFooter>
					</div>
				</DrawerContent>
			</Drawer>
		</section>
	);
}
