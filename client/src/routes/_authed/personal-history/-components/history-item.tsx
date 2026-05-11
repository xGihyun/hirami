import { useAuth } from "@/auth";
import { LabelLarge, LabelSmall } from "@/components/typography";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { BACKEND_URL } from "@/lib/api";
import {
	BorrowRequestStatus,
	type BorrowRequestItem,
	type BorrowRequest,
} from "@/lib/equipment/model";
import { UserRole } from "@/lib/user";
import { getFullName } from "@/lib/user/helper";
import { capitalizeWords, cn } from "@/lib/utils";
import { format } from "date-fns";
import type { JSX } from "react";

type Props = {
	item: BorrowRequestItem;
	transaction: BorrowRequest;
	className?: string;
};

export function HistoryItem(props: Props): JSX.Element {
	const auth = useAuth();
	const equipment = props.item.equipment;
	const equipmentImage = equipment.imageUrl
		? `${BACKEND_URL}${equipment.imageUrl}`
		: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

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

	return (
		<div
			className={cn(
				"hover:bg-tertiary active:bg-tertiary transition flex items-center gap-2 justify-between bg-card rounded-2xl p-4 shadow-item",
				props.className,
			)}
		>
			<div className="flex items-center gap-2 w-full">
				<div className="relative size-16 shrink-0">
					<img
						src={equipmentImage}
						alt={`${equipment.name} ${equipment.brand}`}
						className="w-full h-full object-cover"
					/>
				</div>

				<div className="flex flex-col w-full">
					<LabelLarge>
						{equipment.brand || "No Brand"}
						{equipment.model ? ` ${equipment.model}` : null}
					</LabelLarge>

					<LabelSmall>
						<span className="font-montserrat-bold">Equipment name:</span>{" "}
						{equipment.name}
					</LabelSmall>

					<LabelSmall>
						<span className="font-montserrat-bold">Quantity:</span>{" "}
						{equipment.quantity}
					</LabelSmall>

					<LabelSmall>
						<span className="font-montserrat-bold">Borrow On:</span>{" "}
						{format(props.transaction.requestedAt, "h:mm a")} at{" "}
						{format(props.transaction.requestedAt, "MM/dd/yyyy")}
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

					{auth.user?.role.code === UserRole.EquipmentManager ? (
						<LabelSmall>
							<span className="font-montserrat-bold">Borrower:</span>{" "}
							{props.transaction.borrower.firstName}{" "}
							{props.transaction.borrower.lastName}
						</LabelSmall>
					) : null}

					{props.transaction.review?.reviewedBy ? (
						<LabelSmall>
							<span className="font-montserrat-bold">Borrow confirmed by:</span>{" "}
							{props.transaction.review.reviewedBy.firstName}{" "}
							{props.transaction.review.reviewedBy.lastName}
						</LabelSmall>
					) : null}

					{props?.transaction.returnConfirmations[0]?.confirmedBy && (
						<LabelSmall>
							<span className="font-montserrat-bold">Return confirmed by:</span>{" "}
							{getFullName(props.transaction.returnConfirmations[0].confirmedBy)}
						</LabelSmall>
					)}

					<Badge
						className="mt-1"
						variant={getBadgeVariant(props.transaction.status.code)}
					>
						Status: {capitalizeWords(props.transaction.status.code)}
					</Badge>
				</div>
			</div>
		</div>
	);
}
