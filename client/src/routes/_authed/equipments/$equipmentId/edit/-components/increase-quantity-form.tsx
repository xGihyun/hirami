import type { JSX } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Button } from "@/components/ui/button";
import { BACKEND_URL, type ApiResponse } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Failed } from "@/components/failed";
import { FullScreenLoading } from "@/components/loading";
import { Success } from "@/components/success";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChevronDownIcon } from "lucide-react";
import { LabelMedium } from "@/components/typography";
import { getEquipmentInventoryStatusQuery } from "@/lib/equipment/api";

const increaseQuantitySchema = z.object({
	id: z.uuidv4(),
	quantity: z.number().positive(),
	acquisitionDate: z.date(),
});

type IncreaseQuantitySchema = z.infer<typeof increaseQuantitySchema>;

async function increaseQuantity(
	value: IncreaseQuantitySchema,
): Promise<ApiResponse> {
	const response = await fetch(
		`${BACKEND_URL}/equipments/${value.id}/increase`,
		{
			method: "POST",
			body: JSON.stringify({
				quantity: value.quantity,
				acquisitionDate: value.acquisitionDate,
			}),
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

export function IncreaseQuantityForm(): JSX.Element {
	const params = useParams({ from: "/_authed/equipments/$equipmentId/edit/" });
	const queryClient = useQueryClient();

	const form = useForm<IncreaseQuantitySchema>({
		resolver: zodResolver(increaseQuantitySchema),
		defaultValues: {
			id: params.equipmentId,
			quantity: 1,
			acquisitionDate: new Date(),
		},
		mode: "onTouched",
	});

	const mutation = useMutation({
		mutationFn: increaseQuantity,
		onSuccess: () => {
			queryClient.invalidateQueries(
				getEquipmentInventoryStatusQuery(params.equipmentId),
			);
		},
	});

	async function onSubmit(value: IncreaseQuantitySchema): Promise<void> {
		mutation.mutate(value);
	}

	if (mutation.isPending) {
		return <FullScreenLoading />;
	}

	if (mutation.isError) {
		return (
			<Failed
				fn={mutation.reset}
				retry={form.handleSubmit(onSubmit)}
				header="Failed to increase quantity."
				backLink="/equipments"
				backMessage="or return to Catalog"
				className="md:bg-white md:p-0 absolute inset-0"
			/>
		);
	}

	if (mutation.isSuccess) {
		return (
			<Success
				fn={mutation.reset}
				header="Quantity increased successfully."
				backLink="/equipments"
				className="md:bg-white md:p-0 absolute inset-0"
			/>
		);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<div className="grid grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="quantity"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Quantity to Add</FormLabel>
								<FormControl>
									<NumberInput
										{...field}
										onChange={(v) => field.onChange(v)}
										minValue={1}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="acquisitionDate"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Acquisition Date</FormLabel>
								<Popover>
									<PopoverTrigger asChild>
										<FormControl>
											<Button
												type="button"
												variant="outline"
												className="flex-1 w-full justify-between bg-card font-open-sans text-base text-foreground border-accent"
											>
												{field.value ? (
													field.value.toLocaleDateString()
												) : (
													<LabelMedium className="text-muted">
														Select date
													</LabelMedium>
												)}
												<ChevronDownIcon className="size-4" />
											</Button>
										</FormControl>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={field.value}
											onSelect={field.onChange}
											disabled={(date) =>
												date > new Date() || date < new Date("1900-01-01")
											}
											captionLayout="dropdown"
										/>
									</PopoverContent>
								</Popover>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<Button
					type="submit"
					className="w-full shadow-none"
					disabled={!form.formState.isValid || mutation.isPending}
				>
					Increase Quantity
				</Button>
			</form>
		</Form>
	);
}
