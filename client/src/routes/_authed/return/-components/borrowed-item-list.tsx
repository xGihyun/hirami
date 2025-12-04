import { useAuth } from "@/auth";
import { ComponentLoading } from "@/components/loading";
import { LabelMedium } from "@/components/typography";
import { borrowedItemsQuery } from "@/lib/equipment/borrow";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { useState, type JSX } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import type { SelectedBorrowedEquipment } from "../-model.ts";
import { cn } from "@/lib/utils";
import { type BorrowedEquipment } from "@/lib/equipment/borrow";
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
import { FullScreenLoading } from "@/components/loading.tsx";
import { Success } from "@/components/success.tsx";
import { Failed } from "@/components/failed.tsx";
import z from "zod";
import { BACKEND_URL, type ApiResponse } from "@/lib/api";

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

export function BorrowedItemList(): JSX.Element {
	const search = useSearch({ from: "/_authed/return/" });
	const auth = useAuth();
	const borrowHistory = useQuery(
		borrowedItemsQuery({
			userId: auth.user?.id,
			sort: search.dueDateSort,
			category: search.category,
		}),
	);

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
						item.equipment.borrowRequestItemId !==
						equipment.borrowRequestItemId,
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
				item.equipment.borrowRequestItemId === equipment.borrowRequestItemId
					? { ...item, quantity: newQuantity }
					: item,
			),
		);
	}

	const mutation = useMutation({
		mutationFn: returnEquipments,
	});

	function resetState(): void {
		setIsDialogOpen(false);
		setSelectedEquipments([]);
		console.log("State reset");
	}

	function reset(): void {
		resetState();
		mutation.reset();
		console.log("Reset!");
	}

	async function onSubmit(value: ReturnEquipmentSchema): Promise<void> {
		const equipmentsPayload = selectedEquipments.map((item) => ({
			borrowRequestItemId: item.equipment.borrowRequestItemId,
			quantity: item.quantity,
		}));

		value.items = equipmentsPayload;
		mutation.mutate(value);
	}

	const totalQuantity = selectedEquipments.reduce(
		(total, cur) => total + cur.quantity,
		0,
	);

	if (mutation.isPending) {
		return <FullScreenLoading />;
	}

	if (mutation.isError) {
		return (
			<Failed
				header="Return request failed."
				fn={reset}
				retry={form.handleSubmit(onSubmit)}
				backLink="/return"
				backMessage="or return to Return Page"
			/>
		);
	}

	if (mutation.isSuccess) {
		return (
			<Success
				header="Return request submitted successfully"
				fn={reset}
				backLink="/return"
			/>
		);
	}

	if (borrowHistory.isLoading) {
		return <ComponentLoading />;
	}

	if (borrowHistory.isError) {
		return (
			<LabelMedium className="text-muted text-center mt-10">
				Failed to load borrowed equipments.
			</LabelMedium>
		);
	}

	if (!borrowHistory.data || borrowHistory.data.length === 0) {
		return (
			<LabelMedium className="text-muted text-center mt-10">
				No borrowed equipment found.
			</LabelMedium>
		);
	}

	return (
		<Form {...form}>
			<form
				id="return-request-form"
				onSubmit={form.handleSubmit(onSubmit)}
				className={cn("space-y-4")}
			>
				{borrowHistory.data.map((transaction) => (
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
											handleSelect(equipment, equipment.quantity, checked)
										}
									/>

									<BorrowedItem
										equipment={equipment}
										transaction={transaction}
										handleUpdateQuantity={handleUpdateQuantity}
										className="cursor-pointer group-has-data-[state=checked]:bg-primary group-has-data-[state=checked]:text-primary-foreground"
										isSelected={isChecked}
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
								You are about to return {totalQuantity} items. Do you wish to
								proceed?
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
