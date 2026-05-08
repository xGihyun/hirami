import { H1, LabelMedium, TitleSmall } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconEdit, IconUserPen } from "@/lib/icons";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState, type JSX } from "react";
import { v4 as uuidv4 } from "uuid";
import {
	registerEquipmentSchema,
	type RegisterEquipmentSchema,
} from "./-schema";
import { useRegisterEquipment } from "../-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { equipmentsQuery, registerEquipment } from "@/lib/equipment/api";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDownIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { FullScreenLoading } from "@/components/loading";
import { Failed } from "@/components/failed";
import { Success } from "@/components/success";
import { CategorySelector } from "../../../-components/category-selector";

export const Route = createFileRoute(
	"/_authed/equipments/$equipmentId/_register/register/",
)({
	beforeLoad: () => {
		const isMobile = window.innerWidth < 768;

		if (isMobile) {
			throw redirect({
				to: "/equipments/$equipmentId/register/name",
				params: { equipmentId: uuidv4() },
			});
		}
	},
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	const navigate = Route.useNavigate();
	const queryClient = useQueryClient();
	const registerEquipmentContext = useRegisterEquipment();
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	const form = useForm<RegisterEquipmentSchema>({
		resolver: zodResolver(registerEquipmentSchema),
		defaultValues: registerEquipmentContext.value,
		mode: "onTouched",
	});

	const mutation = useMutation({
		mutationFn: registerEquipment,
	});

	async function onSubmit(value: RegisterEquipmentSchema): Promise<void> {
		mutation.mutate(value);
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

	if (mutation.isError) {
		return (
			<Failed
				header="Equipment registration failed."
				fn={mutation.reset}
				retry={form.handleSubmit(onSubmit)}
				backLink="/equipments"
				backMessage="or return to Catalog"
				className="bg-white md:p-0"
			/>
		);
	}

	if (mutation.isSuccess) {
		return (
			<Success
				header="Equipment has been successfully registered."
				fn={mutation.reset}
				backLink="/equipments"
				className="bg-white"
			/>
		);
	}

	if (mutation.isPending) {
		return <FullScreenLoading />;
	}

	return (
		<div>
			<Button
				variant="ghost"
				size="icon"
				className="size-15 hidden md:flex"
				asChild
			>
				<Link to="/equipments">
					<IconArrowLeft className="size-8" />
				</Link>
			</Button>

			<header className="text-center mb-15">
				<H1>Register Equipment</H1>
				<TitleSmall>
					Begin registering your equipment by providing the necessary
					information.
				</TitleSmall>
			</header>

			<section className="bg-background p-6 rounded-xl">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7.5">
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
									name="categoryIds"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Categories</FormLabel>
											<FormControl>
												<CategorySelector
													selectedCategoryIds={field.value}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<div className="grid grid-cols-2 gap-2.5">
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
								</div>

								<div className="grid grid-cols-2 gap-2.5">
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
														onChange={(e) =>
															field.onChange(e.target.valueAsNumber)
														}
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
																date > new Date() ||
																date < new Date("1900-01-01")
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
									Confirm
								</Button>
							</section>
						</div>
					</form>
				</Form>
			</section>
		</div>
	);
}
