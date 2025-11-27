import { useAuth } from "@/auth";
import { LabelLarge, LabelSmall } from "@/components/typography";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { SHOW_ANOMALY, toImageUrl } from "@/lib/api";
import type { AnomalyResult } from "@/lib/equipment/anomaly";
import {
	BorrowRequestStatus,
	type BorrowTransaction,
} from "@/lib/equipment/borrow";
import { capitalizeWords, cn } from "@/lib/utils";
import { format } from "date-fns";
import type { JSX } from "react";

type Props = {
	transaction: BorrowTransaction;
	className?: string;
};

export function ManagerHistoryItem(props: Props): JSX.Element {
	const auth = useAuth();
	// const equipmentImage = props.equipment.imageUrl
	// 	? `${BACKEND_URL}${props.equipment.imageUrl}`
	// 	: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

	function getBadgeVariant(status: BorrowRequestStatus): BadgeVariant {
		switch (status) {
			case BorrowRequestStatus.Approved:
				return "warning";
			case BorrowRequestStatus.Returned:
				return "success";
			case BorrowRequestStatus.Rejected:
				return "destructive";
			case BorrowRequestStatus.Claimed:
				return "secondary";
		}

		return "default";
	}

	const borrower = props.transaction.borrower;
	const borrowerInitials = borrower.firstName[0] + borrower.lastName[0];
	const totalQuantity = props.transaction.equipments.reduce(
		(prev, acc) => prev + acc.quantity,
		0,
	);
	const anomalyResult = props.transaction.anomalyResult;

	return (
		<div
			className={cn(
				"flex items-center gap-2 justify-between bg-card rounded-2xl p-4 shadow-item",
				props.className,
			)}
		>
			<div className="flex items-center gap-2 w-full">
				<Avatar className="size-16">
					<AvatarImage src={toImageUrl(borrower.avatarUrl)} />
					<AvatarFallback className="font-montserrat-bold">
						{borrowerInitials}
					</AvatarFallback>
				</Avatar>

				<div className="flex flex-col w-full">
					<LabelLarge>
						{borrower.firstName} {borrower.lastName}
					</LabelLarge>

					<LabelSmall>
						<span className="font-montserrat-bold">Total Items:</span>{" "}
						{totalQuantity}
					</LabelSmall>

					<LabelSmall>
						<span className="font-montserrat-bold">Borrow On:</span>{" "}
						{format(props.transaction.borrowedAt, "h:mm a")} at{" "}
						{format(props.transaction.borrowedAt, "MM/dd/yyyy")}
					</LabelSmall>

					<LabelSmall>
						<span className="font-montserrat-bold">Will Return On:</span>{" "}
						{format(props.transaction.expectedReturnAt, "h:mm a")} at{" "}
						{format(props.transaction.expectedReturnAt, "MM/dd/yyyy")}
					</LabelSmall>

					{props.transaction.actualReturnAt ? (
						<LabelSmall>
							<span className="font-montserrat-bold">Returned On:</span>{" "}
							{format(props.transaction.actualReturnAt, "h:mm a")} at{" "}
							{format(props.transaction.actualReturnAt, "MM/dd/yyyy")}
						</LabelSmall>
					) : null}

					{props.transaction.borrowReviewedBy ? (
						<LabelSmall>
							<span className="font-montserrat-bold">Equipment Manager:</span>{" "}
							{props.transaction.borrowReviewedBy.firstName}{" "}
							{props.transaction.borrowReviewedBy.lastName}
						</LabelSmall>
					) : null}

					<div className="space-x-1">
						<Badge
							className="mt-1"
							variant={getBadgeVariant(props.transaction.status)}
						>
							Status: {capitalizeWords(props.transaction.status)}
						</Badge>

						{anomalyResult && anomalyResult.isAnomaly && SHOW_ANOMALY ? (
							<Badge className="mt-1" variant="destructive">
								Anomaly
							</Badge>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
