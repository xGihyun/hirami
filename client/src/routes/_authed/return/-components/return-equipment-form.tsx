import { useState, type JSX } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { BACKEND_URL, type ApiResponse } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SelectedBorrowedEquipment } from "..";
import { useAuth } from "@/auth";
import { cn } from "@/lib/utils";
import {
	borrowHistoryQuery,
	type BorrowedEquipment,
	type BorrowTransaction,
} from "@/lib/equipment/borrow";
import { returnRequestsQuery } from "@/lib/equipment/return";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { Checkbox } from "@/components/ui/checkbox";
import { BorrowedItem } from "./borrowed-item";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

const returnEquipmentItemSchema = z.object({
	borrowRequestItemId: z.string().nonempty(),
	quantity: z.number().positive(),
});

const formSchema = z.object({
	items: z.array(returnEquipmentItemSchema),
});

type ReturnEquipmentSchema = z.infer<typeof formSchema>;

async function returnEquipments(
	value: ReturnEquipmentSchema,
): Promise<ApiResponse> {
	const response = await fetch(`${BACKEND_URL}/return-requests`, {
		method: "POST",
		body: JSON.stringify(value),
		headers: {
			"Content-Type": "application/json",
		},
	});

	const result: ApiResponse = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result;
}

type ReturnEquipmentFormProps = {
	transactions: BorrowTransaction[];
	className?: string;
};

export function ReturnEquipmentForm(
	props: ReturnEquipmentFormProps,
): JSX.Element {
	const auth = useAuth();
	const queryClient = useQueryClient();
	const form = useForm<ReturnEquipmentSchema>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			items: [],
		},
	});

	const [selectedEquipments, setSelectedEquipments] = useState<
		SelectedBorrowedEquipment[]
	>([]);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	function handleSelect(
		equipment: BorrowedEquipment,
		quantity: number,
		checked: CheckedState,
	): void {
		if (!checked) {
			setSelectedEquipments((prev) => {
				return prev.filter(
					(item) =>
						item.equipment.equipmentTypeId !== equipment.equipmentTypeId,
				);
			});
			return;
		}

		setSelectedEquipments((prev) => {
			return [...prev, { equipment: equipment, quantity: quantity }];
		});
	}

	function handleUpdateQuantity(
		equipment: BorrowedEquipment,
		newQuantity: number,
	): void {
		setSelectedEquipments((prev) =>
			prev.map((item) =>
				item.equipment.equipmentTypeId === equipment.equipmentTypeId
					? { ...item, quantity: newQuantity }
					: item,
			),
		);
	}

	const mutation = useMutation({
		mutationFn: returnEquipments,
		onMutate: () => {
			return toast.loading("Submitting return request");
		},
		onSuccess: (data, _variables, toastId) => {
			queryClient.invalidateQueries(
				borrowHistoryQuery({ userId: auth.user?.id }),
			);
			queryClient.invalidateQueries(
				returnRequestsQuery({ userId: auth.user?.id }),
			);
			setIsDialogOpen(false);
			setSelectedEquipments([]);
			toast.success(data.message, { id: toastId });
		},
		onError: (error, _variables, toastId) => {
			toast.error(error.message, { id: toastId });
		},
	});

	async function onSubmit(value: ReturnEquipmentSchema): Promise<void> {
		const equipmentsPayload = selectedEquipments.map((item) => ({
			borrowRequestItemId: item.equipment.borrowRequestItemId,
			quantity: item.quantity,
		}));

		value.items = equipmentsPayload;
		mutation.mutate(value);
	}

	return (
		<Form {...form}>
			<form
				id="return-request-form"
				onSubmit={form.handleSubmit(onSubmit)}
				className={cn("space-y-4", props.className)}
			>
				{props.transactions.map((transaction) => (
					<div
						className="flex flex-col gap-3.5"
						key={transaction.borrowRequestId}
					>
						{transaction.equipments.map((equipment) => {
							const isChecked = selectedEquipments.some(
								(item) =>
									item.equipment.borrowRequestItemId ===
									equipment.borrowRequestItemId,
							);

							return (
								<label
									key={equipment.borrowRequestItemId}
									htmlFor={equipment.borrowRequestItemId}
									className="group text-start"
								>
									<Checkbox
										id={equipment.borrowRequestItemId}
										className="sr-only"
										value={equipment.borrowRequestItemId}
										checked={isChecked}
										onCheckedChange={(checked) =>
											handleSelect(equipment, 1, checked)
										}
									/>

									<BorrowedItem
										equipment={equipment}
										transaction={transaction}
										handleUpdateQuantity={handleUpdateQuantity}
										className="cursor-pointer group-has-data-[state=checked]:bg-primary group-has-data-[state=checked]:text-primary-foreground"
									/>
								</label>
							);
						})}
					</div>
				))}

				<Dialog
					open={isDialogOpen}
					onOpenChange={(open) => setIsDialogOpen(open)}
				>
					{selectedEquipments.length > 0 ? (
						<DialogTrigger asChild>
							<Button
								type="button"
								className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 left-4 z-50 !shadow-item"
							>
								Return Equipments ({selectedEquipments.length})
							</Button>
						</DialogTrigger>
					) : null}

					<DialogContent>
						<DialogHeader>
							<DialogTitle className="text-start">
								Confirm Equipment Return
							</DialogTitle>
							<DialogDescription className="text-start">
								You are about to return {selectedEquipments.length} items. Do
								you wish to proceed?
							</DialogDescription>
						</DialogHeader>

						<DialogFooter>
							<DialogClose asChild>
								<Button type="button" variant="secondary">
									Cancel
								</Button>
							</DialogClose>

							<Button
								disabled={!form.formState.isValid}
								type="submit"
								form="return-request-form"
							>
								Confirm
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</form>
		</Form>
	);
}
