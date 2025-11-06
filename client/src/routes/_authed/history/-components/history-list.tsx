import type { BorrowTransaction } from "@/lib/equipment/borrow";
import type { JSX } from "react";
import { HistoryItem } from "./history-item";
import { LabelMedium } from "@/components/typography";

type Props = {
	history: BorrowTransaction[];
};

export function HistoryList(props: Props): JSX.Element {
	if (props.history.length === 0) {
		return (
			<LabelMedium className="text-muted text-center mt-10">
				No history found
			</LabelMedium>
		);
	}

	return (
		<section className="space-y-4">
			{props.history.map((transaction) => {
				return (
					<div key={transaction.borrowRequestId} className="space-y-4">
						{transaction.equipments.map((equipment) => {
							return (
								<HistoryItem
									transaction={transaction}
									equipment={equipment}
									key={equipment.borrowRequestItemId}
								/>
							);
						})}
					</div>
				);
			})}
		</section>
	);
}
