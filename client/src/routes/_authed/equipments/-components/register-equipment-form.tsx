import { useRef, useState, type JSX } from "react";
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
import {
	BACKEND_URL,
	IMAGE_FORMATS,
	IMAGE_SIZE_LIMIT,
	type ApiResponse,
} from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { equipmentsQuery } from "@/lib/equipment";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LabelMedium } from "@/components/typography";

const formSchema = z.object({
	name: z.string().nonempty(),
	brand: z.string().optional(),
	model: z.string().optional(),
	acquisitionDate: z.date(),
	quantity: z.number().positive(),
	image: z
		.instanceof(File)
		.refine(
			(file) => file.size <= IMAGE_SIZE_LIMIT,
			"Image must be less than 5MB",
		)
		.refine(
			(file) => IMAGE_FORMATS.includes(file.type),
			"Only .jpg, .jpeg, and .png formats are supported",
		)
		.optional(),
});

async function register(
	value: z.infer<typeof formSchema>,
): Promise<ApiResponse> {
	const formData = new FormData();
	formData.append("name", value.name);
	if (value.brand) formData.append("brand", value.brand);
	if (value.model) formData.append("model", value.model);
	formData.append("acquisitionDate", value.acquisitionDate.toISOString());
	formData.append("quantity", value.quantity.toString());
	if (value.image) formData.append("image", value.image);

	const response = await fetch(`${BACKEND_URL}/equipments`, {
		method: "POST",
		body: formData,
	});

	const result: ApiResponse = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result;
}

type RegisterEquipmentFormProps = {
	onSuccess: () => void;
};

export function RegisterEquipmentForm(
	props: RegisterEquipmentFormProps,
): JSX.Element {
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

	const fileInputRef = useRef<HTMLInputElement>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	const mutation = useMutation({
		mutationFn: register,
		onMutate: () => {
			return toast.loading("Registering equipment");
		},
		onSuccess: (data, _variables, toastId) => {
			queryClient.invalidateQueries(equipmentsQuery({ names: [] }));
			props.onSuccess();
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
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7.5">
				<FormField
					control={form.control}
					name="image"
					render={({
						field: { value, onChange, ...fieldProps },
						fieldState,
					}) => (
						<FormItem>
							<FormControl>
								<section>
									<div className="relative group mb-2.5 mx-auto w-fit">
										<div className="relative">
											<Avatar className="size-38">
												<AvatarImage src={previewUrl || undefined} className="object-cover" />
												<AvatarFallback className="bg-accent" />
											</Avatar>
										</div>

										<button
											type="button"
											onClick={() => fileInputRef.current?.click()}
											className="absolute inset-0 opacity-0 flex items-center justify-center cursor-pointer z-50"
										></button>

										<input
											{...fieldProps}
											ref={fileInputRef}
											type="file"
											accept="image/jpeg,image/jpg,image/png"
											className="hidden"
											onChange={(e) => {
												const file = e.target.files?.[0];
												if (file) {
													form.setValue("image", file);
													const reader = new FileReader();
													reader.onloadend = () => {
														setPreviewUrl(reader.result as string);
													};
													reader.readAsDataURL(file);
													onChange(file);
												}
											}}
										/>
									</div>
								</section>
							</FormControl>

							{fieldState.error ? (
								<FormMessage className="text-center mt-1" />
							) : value ? (
								<LabelMedium className="text-muted text-center mt-1">
									{value.name}
								</LabelMedium>
							) : (
								<LabelMedium className="text-muted text-center mt-1">
									Image must be in PNG or JPG, under 5MB
								</LabelMedium>
							)}
						</FormItem>
					)}
				/>

				<section className="space-y-4">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Equipment Name</FormLabel>
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
								<FormLabel>Equipment Brand</FormLabel>
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
								<FormLabel>Equipment Model</FormLabel>
								<FormControl>
									<Input placeholder="V200W" {...field} />
								</FormControl>
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
												className="flex-1 justify-between bg-card font-open-sans text-base text-foreground border-accent"
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
				</section>

				<Button
					type="submit"
					className="w-full shadow-none"
					disabled={!form.formState.isValid || mutation.isPending}
				>
					Save
				</Button>
			</form>
		</Form>
	);
}
