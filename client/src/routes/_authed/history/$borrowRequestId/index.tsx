import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import type { JSX } from "react";
import { H2, LabelLarge, LabelSmall } from "@/components/typography";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SHOW_ANOMALY, toImageUrl } from "@/lib/api";
import { borrowRequestByIdQuery } from "@/lib/equipment/api";
import type { BorrowRequestItem } from "@/lib/equipment/model";
import { IconArrowLeft } from "@/lib/icons";
import { capitalizeWords, cn, getBorrowRequestBadgeVariant } from "@/lib/utils";

export const Route = createFileRoute("/_authed/history/$borrowRequestId/")({
	component: RouteComponent,
	loader: ({ context, params }) => {
		context.queryClient.prefetchQuery(
			borrowRequestByIdQuery(params.borrowRequestId),
		);
	},
});

function RouteComponent(): JSX.Element {
	const params = Route.useParams();
	const borrowRequest = useSuspenseQuery(
		borrowRequestByIdQuery(params.borrowRequestId),
	);

	const borrower = borrowRequest.data.borrower;
	const borrowerInitials = borrower.firstName[0] + borrower.lastName[0];
	const transaction = borrowRequest.data;
	const anomalyResult = borrowRequest.data.anomaly;

	return (
		<div className="space-y-4 pb-15 !mb-0">
			<Button variant="ghost" size="icon" className="size-15 mb-0" asChild>
				<Link to="/history">
					<IconArrowLeft className="size-8" />
				</Link>
			</Button>

			<section className="w-fit mx-auto space-y-2.5">
				<div className="flex flex-col items-center">
					<Avatar className="size-30 mx-auto">
						<AvatarImage src={toImageUrl(borrower.avatarUrl)} />
						<AvatarFallback className="font-montserrat-bold">
							{borrowerInitials}
						</AvatarFallback>
					</Avatar>

					<H2 className="text-center">
						{borrower.firstName} {borrower.lastName}
					</H2>

					<div className="flex gap-1">
						<Badge
							className="mt-1"
							variant={getBorrowRequestBadgeVariant(transaction.status.code)}
						>
							Status: {capitalizeWords(transaction.status.code)}
						</Badge>

						{anomalyResult && anomalyResult.isAnomaly && SHOW_ANOMALY ? (
							<Badge className="mt-1 mx-auto block" variant="destructive">
								Anomaly
							</Badge>
						) : null}
					</div>
				</div>

				<div>
					<LabelSmall>
						Borrowed On {format(transaction.requestedAt, "h:mm a")} at{" "}
						{format(transaction.requestedAt, "MM/dd/yyyy")}
					</LabelSmall>

					<LabelSmall>
						Expected Claim On {format(transaction.expectedClaimAt, "h:mm a")} at{" "}
						{format(transaction.expectedClaimAt, "MM/dd/yyyy")}
					</LabelSmall>

					<LabelSmall>
						Will Return On {format(transaction.expectedReturnAt, "h:mm a")} at{" "}
						{format(transaction.expectedReturnAt, "MM/dd/yyyy")}
					</LabelSmall>

					{transaction.actualReturnAt ? (
						<LabelSmall>
							Returned On {format(transaction.actualReturnAt, "h:mm a")} at{" "}
							{format(transaction.actualReturnAt, "MM/dd/yyyy")}
						</LabelSmall>
					) : null}
				</div>
			</section>

			<section className="space-y-2 h-full">
				{borrowRequest.data.requestedItems.map(({ id, equipment }) => {
					return <EquipmentItem key={id} equipment={equipment} />;
				})}
			</section>

			<Separator />

			<section className="space-y-4">
				<div className="space-y-2">
					<Label>Location</Label>
					<Input value={borrowRequest.data.location} readOnly />
				</div>

				<div className="space-y-2">
					<Label>Purpose</Label>
					<Input value={borrowRequest.data.purpose} readOnly />
				</div>
			</section>
		</div>
	);
}

type EquipmentProps = {
	equipment: BorrowRequestItem["equipment"];
	className?: string;
};

function EquipmentItem(props: EquipmentProps): JSX.Element {
	const equipmentImage =
		toImageUrl(props.equipment.imageUrl) ||
		"https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

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
					<LabelLarge>{props.equipment.brand}</LabelLarge>

					<LabelSmall className="text-muted group-has-data-[state=checked]:text-primary-foreground">
						{props.equipment.name}
					</LabelSmall>
				</div>
			</div>

			<Badge className="mt-1">Quantity ({props.equipment.quantity})</Badge>
		</div>
	);
}
