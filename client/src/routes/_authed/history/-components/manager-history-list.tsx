import type { BorrowTransaction } from "@/lib/equipment/borrow";
import type { JSX } from "react";
import { ManagerHistoryItem } from "./manager-history-item";
import { Link } from "@tanstack/react-router";

type Props = {
	history: BorrowTransaction[];
};

export function ManagerHistoryList(props: Props): JSX.Element {
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
