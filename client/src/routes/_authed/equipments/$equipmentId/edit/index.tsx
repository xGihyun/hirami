import { createFileRoute, Link } from "@tanstack/react-router";
import z from "zod";
import {
	BACKEND_URL,
	IMAGE_FORMATS,
	IMAGE_SIZE_LIMIT,
	toImageUrl,
	type ApiResponse,
} from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type JSX } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getEquipmentInventoryStatusQuery } from "@/lib/equipment/api";
import { FullScreenLoading } from "@/components/loading";
import { H1, H2, LabelMedium, TitleSmall } from "@/components/typography";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconEdit, IconPen, IconUserPen } from "@/lib/icons";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Failed } from "@/components/failed";
import { Success } from "@/components/success";
import { ReallocateForm } from "./-components/reallocate-form";

export const Route = createFileRoute("/_authed/equipments/$equipmentId/edit/")({
	component: RouteComponent,
	loader: ({ context, params }) => {
		context.queryClient.ensureQueryData(
			getEquipmentInventoryStatusQuery(params.equipmentId),
		);
	},
});

const editEquipmentSchema = z.object({
	id: z.uuidv4(),
	name: z.string().nonempty(),
	brand: z.string().optional(),
	model: z.string().optional(),
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

type EditEquipmentSchema = z.infer<typeof editEquipmentSchema>;

async function editEquipment(value: EditEquipmentSchema): Promise<ApiResponse> {
	const formData = new FormData();
	formData.append("name", value.name);
	formData.append("brand", value.brand || "");
	formData.append("model", value.model || "");
	if (value.image) formData.append("image", value.image);

	const response = await fetch(`${BACKEND_URL}/equipments/${value.id}`, {
		method: "PATCH",
		body: formData,
	});

	const result: ApiResponse = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result;
}

function RouteComponent(): JSX.Element {
	const params = Route.useParams();
	const equipmentType = useQuery(
		getEquipmentInventoryStatusQuery(params.equipmentId),
	);

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(
		toImageUrl(equipmentType.data?.imageUrl) || null,
	);
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const [pendingData, setPendingData] = useState<EditEquipmentSchema | null>(
		null,
	);

	const form = useForm<EditEquipmentSchema>({
		resolver: zodResolver(editEquipmentSchema),
		defaultValues: {
			id: params.equipmentId,
			name: equipmentType.data?.name || "",
			brand: equipmentType.data?.brand || "",
			model: equipmentType.data?.model || "",
		},
		mode: "onTouched",
	});

	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: editEquipment,
		onSuccess: () => {
			queryClient.invalidateQueries(
				getEquipmentInventoryStatusQuery(params.equipmentId),
			);
		},
	});

	async function onSubmit(value: EditEquipmentSchema): Promise<void> {
		setPendingData(value);
		setIsConfirmOpen(true);
	}

	function handleConfirm() {
		if (pendingData) {
			mutation.mutate(pendingData);
		}
		setIsConfirmOpen(false);
	}

	function reset(): void {
		mutation.reset();
	}

	function hasChangedValue(): boolean {
		const currentEquipment = equipmentType.data;
		const textFieldsChanged = form.formState.isDirty;
		const originalImageUrl = toImageUrl(currentEquipment?.imageUrl) || null;
		const imageChanged = previewUrl !== originalImageUrl;

		return textFieldsChanged || imageChanged;
	}

	if (mutation.isPending) {
		return <FullScreenLoading />;
	}

	if (mutation.isError) {
		return (
			<Failed
				fn={reset}
				retry={form.handleSubmit(onSubmit)}
				header="Edit equipment failed."
				backLink="/equipments"
				backMessage="or return to Catalog"
				className="md:bg-white md:p-0"
			/>
		);
	}

	if (mutation.isSuccess) {
		return (
			<Success
				fn={reset}
				header="Equipment details updated successfully."
				backLink="/equipments"
				className="md:bg-white md:p-0"
			/>
		);
	}

	return (
		<div className="h-full w-full flex flex-col gap-12 md:gap-0 relative">
			<section className="relative">
				<Button
					variant="ghost"
					size="icon"
					className="size-15 mb-0 absolute inset-0 md:relative"
                    asChild
				>
					<Link to="/equipments">
						<IconArrowLeft className="size-8" />
					</Link>
				</Button>

				<H2 className="text-center block md:hidden">Edit Equipment</H2>
				<header className="text-center mb-15 hidden md:block">
					<H1>Edit Equipment</H1>
					<TitleSmall>
						Begin editing your equipment by providing the necessary information.
					</TitleSmall>
				</header>
			</section>

			<section className="h-full md:hidden block">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7.5">
						<section className="space-y-4">
							<FormField
								control={form.control}
								name="image"
								render={({ field: { value, onChange, ...fieldProps } }) => (
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
														<IconPen className="size-6 text-primary" />
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

										{/* {fieldState.error ? ( */}
										{/* 	<FormMessage className="text-center mt-1" /> */}
										{/* ) : value ? ( */}
										{/* 	<LabelMedium className="text-muted text-center mt-1"> */}
										{/* 		{value.name} */}
										{/* 	</LabelMedium> */}
										{/* ) : ( */}
										{/* 	<LabelMedium className="text-muted text-center mt-1"> */}
										{/* 		Image must be in PNG or JPG, under 5MB */}
										{/* 	</LabelMedium> */}
										{/* )} */}
									</FormItem>
								)}
							/>
						</section>

						<Separator />

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
						</section>

						<Button
							type="submit"
							className="w-full shadow-none"
							disabled={
								!form.formState.isValid ||
								mutation.isPending ||
								!hasChangedValue()
							}
						>
							Update Equipment
						</Button>
					</form>
				</Form>
			</section>

			<div className="space-y-12 md:space-y-5">
				<section className="bg-background p-6 rounded-xl hidden md:block">
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-7.5"
						>
							<div className="flex gap-7.5">
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
															<Avatar className="size-[16.5rem]">
																<AvatarImage
																	src={previewUrl || undefined}
																	className="object-cover"
																/>
																<AvatarFallback className="bg-gradient-to-b from-accent to-[#80786D]" />
															</Avatar>

															<div className="size-21 flex justify-center items-center absolute right-0 bottom-0 rounded-full bg-card z-10">
																<IconUserPen className="size-12 text-primary" />
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

								<section className="space-y-4 w-full">
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

									<Button
										type="submit"
										className="w-full shadow-none"
										disabled={!form.formState.isValid || mutation.isPending}
									>
										Confirm
									</Button>
								</section>
							</div>
						</form>
					</Form>
				</section>

				<Separator />

				<section>
					<ReallocateForm equipmentType={equipmentType.data!} />
				</section>
			</div>

			<Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Are you sure you want to edit this equipment?
						</DialogTitle>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="secondary"
							className="w-25"
							onClick={() => setIsConfirmOpen(false)}
						>
							No
						</Button>
						<Button onClick={handleConfirm} className="w-25">
							Yes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
