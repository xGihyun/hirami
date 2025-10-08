import type { JSX } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { BACKEND_URL, type ApiResponse } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SelectedEquipment } from "..";
import { useAuth } from "@/auth";
import { cn } from "@/lib/utils";

const borrowEquipmentItemSchema = z.object({
	equipmentTypeId: z.string().nonempty(),
	quantity: z.number().positive(),
});

const formSchema = z.object({
	equipments: z.array(borrowEquipmentItemSchema),
	location: z.string().nonempty(),
	purpose: z.string().nonempty(),
	expectedReturnAt: z.date(),
	// TODO: Should probably be set on the server instead
	requestedBy: z.string().nonempty(),
});

async function borrow(value: z.infer<typeof formSchema>): Promise<ApiResponse> {
	const response = await fetch(`${BACKEND_URL}/borrow-requests`, {
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

type BorrowEquipmentFormProps = {
	selectedEquipments: SelectedEquipment[];
	className: string;
};

export function BorrowEquipmentForm(
	props: BorrowEquipmentFormProps,
): JSX.Element {
	const auth = useAuth();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			equipments: [],
			expectedReturnAt: new Date(),
			location: "",
			purpose: "",
			requestedBy: auth.user?.id,
		},
	});

	const mutation = useMutation({
		mutationFn: borrow,
		onMutate: () => {
			return toast.loading("Submitting borrow request");
		},
		onSuccess: (data, _variables, toastId) => {
			toast.success(data.message, { id: toastId });
		},
		onError: (error, _variables, toastId) => {
			toast.error(error.message, { id: toastId });
		},
	});

	async function onSubmit(value: z.infer<typeof formSchema>): Promise<void> {
		const equipmentsPayload = props.selectedEquipments.map((item) => ({
			equipmentTypeId: item.equipment.id,
			quantity: item.quantity,
		}));

		value.equipments = equipmentsPayload;
		mutation.mutate(value);
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className={cn("space-y-8", props.className)}
			>
				<h2>Selected Equipments:</h2>

				<div>
					{props.selectedEquipments.map((selectedEquipment) => {
						const equipment = selectedEquipment.equipment;
						return (
							<div key={equipment.id}>
								{selectedEquipment.quantity} pcs. {equipment.name}{" "}
								{equipment.brand} {equipment.model}
							</div>
						);
					})}
				</div>

				<FormField
					control={form.control}
					name="location"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Location</FormLabel>
							<FormControl>
								<Input placeholder="Volleyball Court" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="purpose"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Purpose</FormLabel>
							<FormControl>
								<Input placeholder="PE Class" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type="submit" className="w-full">
					Borrow Equipment
				</Button>
			</form>
		</Form>
	);
}
