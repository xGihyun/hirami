import { LabelLarge, LabelSmall } from "@/components/typography";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { BACKEND_URL } from "@/lib/api";
import {
	BorrowRequestStatus,
	type BorrowedEquipment,
	type BorrowTransaction,
} from "@/lib/equipment/borrow";
import { capitalizeWords, cn } from "@/lib/utils";
import { format } from "date-fns";
import type { JSX } from "react";

type Props = {
	equipment: BorrowedEquipment;
	transaction: BorrowTransaction;
	className?: string;
};

export function HistoryItem(props: Props): JSX.Element {
	const equipmentImage = props.equipment.imageUrl
		? `${BACKEND_URL}${props.equipment.imageUrl}`
		: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

	function getBadgeVariant(status: BorrowRequestStatus): BadgeVariant {
		switch (status) {
			case BorrowRequestStatus.Approved:
				return "warning";
			case BorrowRequestStatus.Fulfilled:
				return "success";
			case BorrowRequestStatus.Rejected:
				return "destructive";
		}

		return "default";
	}

	return (
		<div
			key={props.equipment.borrowRequestItemId}
			className={cn(
				"flex items-center gap-2 justify-between bg-card rounded-2xl p-4 shadow-item",
				props.className,
			)}
		>
			<div className="flex items-center gap-2 w-full">
				<div className="relative size-16 shrink-0">
					<img
						src={equipmentImage}
						alt={`${props.equipment.name} ${props.equipment.brand}`}
						className="w-full h-full object-cover"
					/>

					<span className="size-5 bg-primary text-primary-foreground rounded-full absolute bottom-0 right-0 content-center text-center">
						<LabelSmall>x{props.equipment.quantity}</LabelSmall>
					</span>
				</div>

				<div className="flex flex-col w-full">
					<LabelLarge>
						{props.equipment.brand}
						{props.equipment.model ? ` ${props.equipment.model}` : null}
					</LabelLarge>

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

					<Badge
						className="mt-1"
						variant={getBadgeVariant(props.transaction.status)}
					>
						Status: {capitalizeWords(props.transaction.status)}
					</Badge>
				</div>
			</div>
		</div>
	);
}
