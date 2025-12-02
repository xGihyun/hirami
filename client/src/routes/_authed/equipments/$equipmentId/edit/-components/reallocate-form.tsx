import type { JSX } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	EquipmentStatus,
	type EquipmentType,
} from "@/lib/equipment";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import z from "zod";
import { useParams } from "@tanstack/react-router";
import { NumberInput } from "@/components/number-input";
import {
	NativeSelect,
	NativeSelectOption,
} from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { BACKEND_URL, type ApiResponse } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Failed } from "@/components/failed";
import { FullScreenLoading } from "@/components/loading";
import { Success } from "@/components/success";

const reallocateEquipmentSchema = z
	.object({
		id: z.uuidv4(),
		quantity: z.number().positive(),
		oldStatus: z.enum(EquipmentStatus),
		newStatus: z.enum(EquipmentStatus).optional(),
	})
	.refine((data) => data.oldStatus !== data.newStatus, {
		message: "Source and destination status must be different.",
		path: ["newStatus"],
	});

type ReallocateEquipmentSchema = z.infer<typeof reallocateEquipmentSchema>;

async function reallocateEquipment(
	value: ReallocateEquipmentSchema,
): Promise<ApiResponse> {
	const response = await fetch(
		`${BACKEND_URL}/equipments/${value.id}/reallocate`,
		{
			method: "POST",
			body: JSON.stringify(value),
			headers: {
				"Content-Type": "application/json",
			},
		},
	);

	const result: ApiResponse = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result;
}

type Props = {
	equipmentType: EquipmentType;
};

export function ReallocateForm(props: Props): JSX.Element {
	const params = useParams({ from: "/_authed/equipments/$equipmentId/edit/" });

	const form = useForm<ReallocateEquipmentSchema>({
		resolver: zodResolver(reallocateEquipmentSchema),
		defaultValues: {
			id: params.equipmentId,
			quantity: 1,
			oldStatus: EquipmentStatus.Available,
		},
		mode: "onTouched",
	});

	const mutation = useMutation({
		mutationFn: reallocateEquipment,
	});

	async function onSubmit(value: ReallocateEquipmentSchema): Promise<void> {
		mutation.mutate(value);
	}

	function reset(): void {
		mutation.reset();
	}

	if (mutation.isPending) {
		return <FullScreenLoading />;
	}

	if (mutation.isError) {
		return (
			<Failed
				fn={reset}
				retry={form.handleSubmit(onSubmit)}
				header="Reallocate equipment failed."
				backLink="/equipments"
				backMessage="or return to Catalog"
			/>
		);
	}

	if (mutation.isSuccess) {
		return (
			<Success
				fn={reset}
				header="Equipment reallocated successfully."
				backLink="/equipments"
			/>
		);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="quantity"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Quantity to Move</FormLabel>
							<FormControl>
								<NumberInput
									{...field}
									onChange={(v) => field.onChange(v)}
									maxValue={
										props.equipmentType.statusQuantity.find(
											(v) => v.status.code === form.getValues().oldStatus,
										)?.quantity
									}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="oldStatus"
					render={({ field }) => (
						<FormItem>
							<FormLabel>From Status</FormLabel>
							<FormControl>
								<NativeSelect
									{...field}
									onChange={(e) =>
										field.onChange(e.currentTarget.value as EquipmentStatus)
									}
								>
									{props.equipmentType.statusQuantity.map((q) => (
										<NativeSelectOption
											value={q.status.code}
											key={q.status.code}
											disabled={
												q.quantity === 0 ||
												q.status.code === EquipmentStatus.Borrowed ||
												q.status.code === EquipmentStatus.Reserved
											}
										>
											{q.status.label} ({q.quantity} units)
										</NativeSelectOption>
									))}
								</NativeSelect>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="newStatus"
					render={({ field }) => (
						<FormItem>
							<FormLabel>To Status</FormLabel>
							<FormControl>
								<NativeSelect
									{...field}
									onChange={(e) =>
										field.onChange(e.currentTarget.value as EquipmentStatus)
									}
								>
									<NativeSelectOption disabled selected hidden>Select status</NativeSelectOption>

									{props.equipmentType.statusQuantity.map((q) => (
										<NativeSelectOption
											value={q.status.code}
											key={q.status.code}
											disabled={
												q.status.code === EquipmentStatus.Borrowed ||
												q.status.code === EquipmentStatus.Reserved
											}
										>
											{q.status.label} ({q.quantity} units)
										</NativeSelectOption>
									))}
								</NativeSelect>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type="submit" className="w-full shadow-none">
					Reallocate
				</Button>
			</form>
		</Form>
	);
}
