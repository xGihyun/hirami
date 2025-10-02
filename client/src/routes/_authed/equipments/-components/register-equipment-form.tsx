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
import { toast } from "sonner";
import { BACKEND_URL, type ApiResponse } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon } from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { equipmentsQuery } from "@/lib/equipment";
// import { fetch } from '@tauri-apps/plugin-http';

const formSchema = z.object({
	name: z.string().nonempty(),
	brand: z.string().optional(),
	model: z.string().optional(),
	acquisitionDate: z.date(),
	quantity: z.number().positive(),
});

async function register(
	value: z.infer<typeof formSchema>,
): Promise<ApiResponse> {
	console.log(value);
	const response = await fetch(
		`${BACKEND_URL}/equipments`,
		{
			method: "POST",
			body: JSON.stringify(value),
			headers: { "Content-Type": "application/json" },
		},
	);

	const result: ApiResponse = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result;
}

export function RegisterEquipmentForm(): JSX.Element {
	const queryClient = useQueryClient();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			brand: "",
			model: "",
			acquisitionDate: new Date(),
			quantity: 1,
		},
	});

	const mutation = useMutation({
		mutationFn: register,
		onMutate: () => {
			return toast.loading("Registering equipment");
		},
		onSuccess: (data, _variables, toastId) => {
			queryClient.invalidateQueries(equipmentsQuery);
			toast.success(data.message, { id: toastId });
		},
		onError: (error, _variables, toastId) => {
			toast.error(error.message, { id: toastId });
		},
	});

	async function onSubmit(value: z.infer<typeof formSchema>): Promise<void> {
		mutation.mutate(value);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Name</FormLabel>
							<FormControl>
								<Input placeholder="Volleyball" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="brand"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Brand</FormLabel>
							<FormControl>
								<Input placeholder="Mikasa" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="model"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Model</FormLabel>
							<FormControl>
								<Input placeholder="V200W" {...field} />
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
											variant={"outline"}
											className={cn(
												"w-[240px] pl-3 text-left font-normal",
												!field.value && "text-muted-foreground",
											)}
										>
											{field.value ? (
												format(field.value, "PPP")
											) : (
												<span>Pick a date</span>
											)}
											<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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

				<FormField
					control={form.control}
					name="quantity"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Quantity</FormLabel>
							<FormControl>
								<Input
									type="number"
									placeholder="Enter quantity"
									{...field}
									onChange={(e) => field.onChange(e.target.valueAsNumber)}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type="submit">Register Equipment</Button>
			</form>
		</Form>
	);
}
