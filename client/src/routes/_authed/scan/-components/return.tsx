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
import { useState, type JSX } from "react";
import { toImageUrl } from "@/lib/api";
import { format } from "date-fns";
import {
	Caption,
	LabelLarge,
	LabelMedium,
	LabelSmall,
	P,
} from "@/components/typography";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { Failed } from "@/components/failed";
import { Success } from "@/components/success";
import {
	confirmReturnRequest,
	type ReturnRequest,
} from "@/lib/equipment/return";
import type { Equipment } from "@/lib/equipment";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/auth";

type Props = {
	request: ReturnRequest;
	reset: () => void;
};

export function Return(props: Props): JSX.Element {
	const auth = useAuth();
	const [remarks, setRemarks] = useState("");
	const mutation = useMutation({
		mutationFn: confirmReturnRequest,
	});
	const borrower = props.request.borrower;

	function reset(): void {
		mutation.reset();
		props.reset();
	}

	if (mutation.isError) {
		return (
			<Failed backLink="/scan" header="Failed to confirm return." fn={reset} />
		);
	}

	if (mutation.isSuccess) {
		return (
			<Success
				backLink="/scan"
				header="Successfully returned equipments."
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
					{format(props.request.createdAt, "MMM d, yyyy - hh:mm a")}
				</DrawerDescription>
			</DrawerHeader>

			<div className="px-4 py-4 overflow-y-auto space-y-4">
				<EquipmentList equipments={props.request.equipments} />

				<div className="space-y-1">
					<LabelMedium>Remarks</LabelMedium>
					<Textarea
						className="min-h-24"
						placeholder="Add your remarks here"
						onChange={(v) => setRemarks(v.currentTarget.value)}
						value={remarks}
					/>
				</div>

				<DrawerFooter className="mt-0">
					<Button
						onClick={() => {
							if (!auth.user) return;
							mutation.mutate({
								returnRequestId: props.request.id,
								reviewedBy: auth.user.id,
								remarks: remarks,
							});
						}}
					>
						Confirm Return
					</Button>
					<DrawerClose asChild>
						<Button variant="secondary">Close</Button>
					</DrawerClose>
				</DrawerFooter>
			</div>
		</DrawerContent>
	);
}

function EquipmentList({ equipments }: { equipments: Equipment[] }) {
	return (
		<div>
			{equipments.map((equipment) => {
				const key = equipment.id;
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
