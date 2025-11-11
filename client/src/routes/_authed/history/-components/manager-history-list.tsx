import type { BorrowTransaction } from "@/lib/equipment/borrow";
import type { JSX } from "react";
import { LabelMedium } from "@/components/typography";
import { ManagerHistoryItem } from "./manager-history-item";
import { Link } from "@tanstack/react-router";

type Props = {
	history: BorrowTransaction[];
};

export function ManagerHistoryList(props: Props): JSX.Element {
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
					<Link
						key={transaction.borrowRequestId}
						to="/history/$borrowRequestId"
						params={{ borrowRequestId: transaction.borrowRequestId }}
                        className="block"
					>
						<ManagerHistoryItem transaction={transaction} />
					</Link>
				);
			})}
		</section>
	);
}
