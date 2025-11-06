import type { BorrowTransaction } from "@/lib/equipment/borrow";
import type { JSX } from "react";
import { HistoryItem } from "./history-item";

type Props = {
	history: BorrowTransaction[];
};

export function HistoryList(props: Props): JSX.Element {
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
