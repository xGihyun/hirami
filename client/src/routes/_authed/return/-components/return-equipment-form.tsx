import type { JSX } from "react";
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
import { Caption } from "@/components/typography";
import { NumberInput } from "@/components/number-input";
import {
	borrowHistoryQuery,
	type BorrowedEquipment,
} from "@/lib/equipment/borrow";
import { returnRequestsQuery } from "@/lib/equipment/return";

const returnEquipmentItemSchema = z.object({
	borrowRequestItemId: z.string().nonempty(),
	quantity: z.number().positive(),
});

const formSchema = z.object({
	items: z.array(returnEquipmentItemSchema),
});

async function returnEquipments(
	value: z.infer<typeof formSchema>,
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
	selectedEquipments: SelectedBorrowedEquipment[];
	className: string;
	handleUpdateQuantity: (
		equipment: BorrowedEquipment,
		newQuantity: number,
	) => void;
};

export function ReturnEquipmentForm(
	props: ReturnEquipmentFormProps,
): JSX.Element {
	const auth = useAuth();
	const queryClient = useQueryClient();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			items: [],
		},
	});

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
			toast.success(data.message, { id: toastId });
		},
		onError: (error, _variables, toastId) => {
			toast.error(error.message, { id: toastId });
		},
	});

	async function onSubmit(value: z.infer<typeof formSchema>): Promise<void> {
		const equipmentsPayload = props.selectedEquipments.map((item) => ({
			borrowRequestItemId: item.equipment.borrowRequestItemId,
			quantity: item.quantity,
		}));

		value.items = equipmentsPayload;
		mutation.mutate(value);
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className={cn("space-y-4", props.className)}
			>
				<section className="space-y-2">
					{props.selectedEquipments.map((selectedEquipment) => {
						const equipment = selectedEquipment.equipment;
						const equipmentImage = equipment.imageUrl
							? `${BACKEND_URL}${equipment.imageUrl}`
							: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

						return (
							<div
								key={equipment.equipmentTypeId}
								className="flex items-center gap-2 justify-between"
							>
								<div className="flex items-center gap-2 w-full">
									<img
										src={equipmentImage}
										alt={`${equipment.name} ${equipment.brand}`}
										className="size-20 object-cover"
									/>

									<div className="flex flex-col">
										<p className="font-montserrat-semibold text-base leading-6">
											{equipment.name}
										</p>

										<Caption>
											{equipment.brand}
											{equipment.model ? " - " : null}
											{equipment.model}
										</Caption>
									</div>
								</div>

								<NumberInput
									onChange={(v) => props.handleUpdateQuantity(equipment, v)}
									maxValue={equipment.quantity}
								/>
							</div>
						);
					})}
				</section>

				<Button type="submit" className="w-full">
					Return Equipments
				</Button>
			</form>
		</Form>
	);
}
