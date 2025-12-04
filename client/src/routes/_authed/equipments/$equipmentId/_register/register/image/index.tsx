import { createFileRoute } from "@tanstack/react-router";
import { H1, LabelMedium } from "@/components/typography";
import z from "zod";
import { useEffect, useRef, useState, type JSX } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
	useRegisterEquipment,
	type RegisterEquipmentData,
} from "../../-context";
import {
	BACKEND_URL,
	IMAGE_FORMATS,
	IMAGE_SIZE_LIMIT,
	type ApiResponse,
} from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { equipmentsQuery } from "@/lib/equipment";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FullScreenLoading } from "@/components/loading";
import { Failed } from "../../-components/failed";
import { Success } from "../../-components/success";
import { IconEdit, IconUserPen } from "@/lib/icons";

export const Route = createFileRoute(
	"/_authed/equipments/$equipmentId/_register/register/image/",
)({
	component: RouteComponent,
});

const registerEquipmentImageSchema = z.object({
	image: z
		.instanceof(File)
		.refine(
			(file) => file.size <= IMAGE_SIZE_LIMIT,
			"Invalid file: Must be PNG or JPG, under 5MB",
		)
		.refine(
			(file) => IMAGE_FORMATS.includes(file.type),
			"Invalid file: Must be PNG or JPG, under 5MB",
		)
		.optional(),
});

export type RegisterEquipmentImageSchema = z.infer<
	typeof registerEquipmentImageSchema
>;

async function registerEquipment(
	value: RegisterEquipmentData,
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

function RouteComponent(): JSX.Element {
	const navigate = Route.useNavigate();
	const queryClient = useQueryClient();

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	const registerEquipmentContext = useRegisterEquipment();

	const form = useForm<RegisterEquipmentImageSchema>({
		resolver: zodResolver(registerEquipmentImageSchema),
		defaultValues: {
			image: registerEquipmentContext.value.image,
		},
		mode: "onTouched",
	});

	const mutation = useMutation({
		mutationFn: registerEquipment,
	});

	async function onSubmit(value: RegisterEquipmentImageSchema): Promise<void> {
		const data: RegisterEquipmentData = {
			...registerEquipmentContext.value,
			...value,
		};
		registerEquipmentContext.setValue(data);

		mutation.mutate(data);
	}

	async function onSuccess(): Promise<void> {
		queryClient.invalidateQueries(equipmentsQuery({ names: [] }));
		await navigate({ to: "/equipments" });
		mutation.reset();
	}

	useEffect(() => {
		const imageFile = registerEquipmentContext.value.image;
		if (imageFile) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setPreviewUrl(reader.result as string);
			};
			reader.readAsDataURL(imageFile);
		}

		const hasExistingValues =
			registerEquipmentContext.value.name ||
			registerEquipmentContext.value.brand ||
			registerEquipmentContext.value.model ||
			registerEquipmentContext.value.quantity ||
			registerEquipmentContext.value.acquisitionDate;

		if (hasExistingValues) {
			form.trigger();
		}

		return () => {
			const currentValues = form.getValues();
			registerEquipmentContext.setValue((prev) => ({
				...prev,
				...currentValues,
			}));
		};
	}, []);

	if (mutation.isPending) {
		return <FullScreenLoading />;
	}

	if (mutation.isError) {
		return (
			<Failed reset={onSuccess} retry={() => onSubmit(mutation.variables)} />
		);
	}

	if (mutation.isSuccess) {
		return <Success fn={onSuccess} />;
	}

	return (
		<div className="h-full w-full flex flex-col gap-12">
			<H1 className="text-center">Upload Equipment Image</H1>

			<section className="h-full">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7.5">
						<section className="space-y-4">
							<FormField
								control={form.control}
								name="image"
								render={({
									field: { value, onChange, ...fieldProps },
									fieldState,
								}) => (
									<FormItem>
										<FormControl>
											<div className="relative group mb-2.5 w-fit mx-auto">
												<div className="relative">
													<Avatar className="size-50">
														<AvatarImage
															src={previewUrl || undefined}
															className="object-cover"
														/>
														<AvatarFallback className="bg-accent" />
													</Avatar>

													<div className="size-12 flex justify-center items-center absolute right-0 bottom-0 rounded-full bg-card z-10">
														<IconUserPen className="size-6 text-primary" />
													</div>
												</div>

												<button
													type="button"
													onClick={() => fileInputRef.current?.click()}
													className="absolute inset-0 opacity-0 flex items-center justify-center cursor-pointer z-50"
												>
													<IconEdit className="size-6 text-white" />
												</button>

												<input
													{...fieldProps}
													ref={fileInputRef}
													type="file"
													accept="image/jpeg,image/jpg,image/png"
													className="hidden"
													onChange={(e) => {
														const file = e.target.files?.[0];
														if (file) {
															form.setValue("image", file, {
																shouldValidate: true,
															});
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
						</section>

						<Button
							type="submit"
							className="w-full shadow-none"
							disabled={!form.formState.isValid || mutation.isPending}
						>
							Register
						</Button>
					</form>
				</Form>
			</section>
		</div>
	);
}
