import { updateBorrowRequest } from "@/lib/equipment/api";
import {
	BorrowRequestStatus,
	type BorrowRequestItem,
	type BorrowRequest,
} from "@/lib/equipment/model";
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
import { DEFAULT_EQUIPMENT_IMAGE } from "@/lib/equipment/constant";

type Props = {
	transaction: BorrowRequest;
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
			<Failed
				backLink="/scan"
				header="Failed to claim request."
				fn={reset}
				className="md:absolute md:inset-0 md:z-500"
			/>
		);
	}

	if (mutation.isSuccess) {
		return (
			<Success
				backLink="/scan"
				header="Successfully claimed equipments."
				fn={reset}
				className="md:absolute md:inset-0 md:z-500"
			/>
		);
	}

	return (
		<DrawerContent className="space-y-4 h-full md:h-auto">
			<DrawerHeader className="md:max-w-sm md:w-full md:mx-auto md:p-0 md:mb-0">
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
					{format(props.transaction.requestedAt, "MMM d, yyyy - hh:mm a")}
				</DrawerDescription>
			</DrawerHeader>
			<div className="px-4 py-4 overflow-y-auto space-y-4 md:max-w-sm md:w-full md:mx-auto">
				<EquipmentList equipments={props.transaction.requestedItems} />

				<DrawerFooter className="p-0">
					<Button
						onClick={() =>
							mutation.mutate({
								id: props.transaction.id,
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

function EquipmentList({ equipments }: { equipments: BorrowRequestItem[] }) {
	return (
		<div className="space-y-2.5">
			{equipments.map(({ id, equipment }) => {
				const equipmentImage =
					toImageUrl(equipment.imageUrl) || DEFAULT_EQUIPMENT_IMAGE;

				return (
					<div className="flex flex-col gap-2 w-full" key={id}>
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
