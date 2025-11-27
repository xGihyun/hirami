import type {
	BorrowedEquipment,
	BorrowTransaction,
} from "@/lib/equipment/borrow";
import { useState, type JSX } from "react";
import { HistoryItem } from "./history-item";
import { Caption, LabelMedium, TitleSmall } from "@/components/typography";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@/lib/icons";
import { toImageUrl } from "@/lib/api";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_EQUIPMENT_IMAGE } from "@/lib/equipment";

type Props = {
	history: BorrowTransaction[];
};

type Selected = {
	transaction: BorrowTransaction;
	equipment: BorrowedEquipment;
};

export function HistoryList(props: Props): JSX.Element {
	const [selectedItem, setSelectedItem] = useState<Selected | null>(null);
	if (props.history.length === 0) {
		return (
			<LabelMedium className="text-muted text-center mt-10">
				No history found
			</LabelMedium>
		);
	}

	if (selectedItem !== null) {
		return (
			<div className="px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] h-svh inset-0 fixed bg-background w-full z-50">
				<Button
					variant="ghost"
					size="icon"
					className="size-15"
					onClick={() => setSelectedItem(null)}
				>
					<IconArrowLeft className="size-8" />
				</Button>

				<section className="space-y-2">
					<img
						src={toImageUrl(selectedItem.equipment.imageUrl) || DEFAULT_EQUIPMENT_IMAGE}
						alt={`${selectedItem.equipment.name} ${selectedItem.equipment.brand}`}
						className="size-16 object-cover rounded-2xl mx-auto"
					/>

					<TitleSmall className="text-center">
						{selectedItem.equipment.brand}{" "}
						{selectedItem.equipment.model
							? ` ${selectedItem.equipment.model}`
							: null}
					</TitleSmall>

					<div className="text-center text-muted">
						<Caption>
							Requested On{" "}
							{format(selectedItem.transaction.borrowedAt, "h:mm a")} at{" "}
							{format(selectedItem.transaction.borrowedAt, "MM/dd/yyyy")}
						</Caption>

						<Caption>
							Will Return On{" "}
							{format(selectedItem.transaction.expectedReturnAt, "h:mm a")} at{" "}
							{format(selectedItem.transaction.expectedReturnAt, "MM/dd/yyyy")}
						</Caption>

						{selectedItem.transaction.actualReturnAt ? (
							<Caption>
								Returned On{" "}
								{format(selectedItem.transaction.actualReturnAt, "h:mm a")} at{" "}
								{format(selectedItem.transaction.actualReturnAt, "MM/dd/yyyy")}
							</Caption>
						) : null}
					</div>

					<div className="space-y-1">
						<LabelMedium>Remarks</LabelMedium>
						<Textarea
							readOnly
							className="min-h-24"
							placeholder="Remarks will show here if available"
							value={selectedItem.transaction.remarks || undefined}
						/>
					</div>
				</section>
			</div>
		);
	}

	return (
		<section className="space-y-4">
			{props.history.map((transaction) => {
				return (
					<div key={transaction.borrowRequestId} className="space-y-4">
						{transaction.equipments.map((equipment, i) => {
							return (
								<button
									key={transaction.borrowRequestId + i}
									className="text-start w-full cursor-pointer"
									onClick={() => setSelectedItem({ transaction, equipment })}
								>
									<HistoryItem
										transaction={transaction}
										equipment={equipment}
										key={equipment.borrowRequestItemId}
									/>
								</button>
							);
						})}
					</div>
				);
			})}
		</section>
	);
}
