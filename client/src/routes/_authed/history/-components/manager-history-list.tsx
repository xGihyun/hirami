import type { BorrowRequest } from "@/lib/equipment/model";
import type { JSX } from "react";
import { ManagerHistoryItem } from "./manager-history-item";
import { Link } from "@tanstack/react-router";

type Props = {
	history: BorrowRequest[];
};

export function ManagerHistoryList(props: Props): JSX.Element {
	return (
		<section className="space-y-4">
			{props.history.map((transaction) => {
				return (
					<Link
						key={transaction.id}
						to="/history/$borrowRequestId"
						params={{ borrowRequestId: transaction.id }}
						className="block"
					>
						<ManagerHistoryItem transaction={transaction} />
					</Link>
				);
			})}
		</section>
	);
}
