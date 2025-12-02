import {
	BorrowRequestStatus,
	updateBorrowRequest,
	type BorrowedEquipment,
	type BorrowTransaction,
} from "@/lib/equipment/borrow";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import type { JSX } from "react";
import { toImageUrl } from "@/lib/api";
import { format } from "date-fns";
import { Caption, LabelLarge, LabelSmall, P } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { Failed } from "@/components/failed";
import { Success } from "@/components/success";

type Props = {
	transaction: BorrowTransaction;
	reset: () => void;
};

export function Borrow(props: Props): JSX.Element {
	const borrower = props.transaction.borrower;
	const mutation = useMutation({
		mutationFn: updateBorrowRequest,
	});

	function reset(): void {
		mutation.reset();
		props.reset();
	}

	if (mutation.isError) {
		return (
			<Failed backLink="/scan" header="Failed to claim request." fn={reset} />
		);
	}

	if (mutation.isSuccess) {
		return (
			<Success
				backLink="/scan"
				header="Successfully claimed equipments."
				fn={reset}
			/>
		);
	}

	return (
		<DrawerContent className="space-y-4 h-full">
			<DrawerHeader>
				<DrawerTitle className="items-center flex flex-col">
					<Avatar className="size-12">
						<AvatarImage src={toImageUrl(borrower.avatarUrl)} />
						<AvatarFallback className="font-montserrat-bold">
							{borrower.firstName[0]}
							{borrower.lastName[0]}
						</AvatarFallback>
					</Avatar>
					<P>
						{borrower.firstName} {borrower.lastName}
					</P>
				</DrawerTitle>
				<DrawerDescription>
					Requested on{" "}
					{format(props.transaction.borrowedAt, "MMM d, yyyy - hh:mm a")}
				</DrawerDescription>
			</DrawerHeader>
			<div className="px-4 py-4 overflow-y-auto space-y-4">
				<EquipmentList equipments={props.transaction.equipments} />

				<DrawerFooter>
					<Button
						onClick={() =>
							mutation.mutate({
								id: props.transaction.borrowRequestId,
								status: BorrowRequestStatus.Claimed,
							})
						}
					>
						Confirm Claim
					</Button>
					<DrawerClose asChild>
						<Button variant="secondary">Close</Button>
					</DrawerClose>
				</DrawerFooter>
			</div>
		</DrawerContent>
	);
}

function EquipmentList({ equipments }: { equipments: BorrowedEquipment[] }) {
	return (
		<div className="space-y-2.5">
			{equipments.map((equipment) => {
				const key = equipment.borrowRequestItemId;
				const equipmentImage =
					toImageUrl(equipment.imageUrl) ||
					"https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

				return (
					<div className="flex flex-col gap-2 w-full" key={key}>
						<div className="flex items-center gap-3 justify-between p-4 bg-card rounded-2xl shadow-item">
							<div className="flex items-center gap-2 w-full">
								<img
									src={equipmentImage}
									alt={`${equipment.name} ${equipment.brand}`}
									className="size-20 object-cover"
								/>
								<div className="flex flex-col">
									<LabelLarge>
										{equipment.brand} {equipment.model}
									</LabelLarge>
									<LabelSmall className="text-muted">
										{equipment.name}
									</LabelSmall>
									<Caption className="font-open-sans-bold">
										{equipment.quantity} pcs.
									</Caption>
								</div>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
