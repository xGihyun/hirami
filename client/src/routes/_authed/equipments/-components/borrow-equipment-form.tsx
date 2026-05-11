import { zodResolver } from "@hookform/resolvers/zod";
import { DialogClose } from "@radix-ui/react-dialog";
import { useMutation } from "@tanstack/react-query";
import { ChevronDownIcon } from "lucide-react";
import type { Dispatch, JSX, SetStateAction } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/auth";
import { Failed } from "@/components/failed";
import { FullScreenLoading } from "@/components/loading";
import { NumberInput } from "@/components/number-input";
import { Success } from "@/components/success";
import { H1, LabelLarge, LabelSmall } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { BACKEND_URL } from "@/lib/api";
import type { Equipment } from "@/lib/equipment/model";
import { IconArrowLeft } from "@/lib/icons";
import type { SelectedEquipment } from "..";
import {
	type CreateBorrowRequest,
	createBorrowRequest,
	createBorrowRequestSchema,
} from "../-function";

type BorrowEquipmentFormProps = {
	selectedEquipments: SelectedEquipment[];
	handleUpdateQuantity: (equipment: Equipment, newQuantity: number) => void;
	reset: () => void;
	setIsBorrowing: Dispatch<SetStateAction<boolean>>;
};

export function BorrowEquipmentForm(
	props: BorrowEquipmentFormProps,
): JSX.Element {
	const auth = useAuth();
	const [openReturnCalendar, setOpenReturnCalendar] = useState(false);
	const [openClaimCalendar, setOpenClaimCalendar] = useState(false);

	const form = useForm<CreateBorrowRequest>({
		resolver: zodResolver(
			createBorrowRequestSchema
				.refine(
					(data) => {
						const minTime = new Date(Date.now() + 1 * 60 * 60 * 1000);
						return data.expectedClaimAt >= minTime;
					},
					{
						message: "Expected claim time must be at least 1 hour from now.",
						path: ["expectedClaimAt"],
					},
				)
				.refine(
					(data) => {
						const minTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
						return data.expectedReturnAt >= minTime;
					},
					{
						message: "Expected return time must be at least 2 hours from now.",
						path: ["expectedReturnAt"],
					},
				)
				.refine((data) => data.expectedReturnAt > data.expectedClaimAt, {
					message: "Expected return time must be after claim time.",
					path: ["expectedReturnAt"],
				}),
		),
		defaultValues: {
			equipments: [],
			expectedClaimAt: new Date(Date.now() + 1 * 60 * 60 * 1000 + 60000), // Default to 1h 1m from now
			expectedReturnAt: new Date(Date.now() + 2 * 60 * 60 * 1000 + 60000), // Default to 2h 1m from now
			location: "",
			purpose: "",
			requestedBy: auth.user?.id,
			agreedToPolicy: false,
		},
		mode: "onTouched",
		reValidateMode: "onChange",
	});

	const mutation = useMutation({
		mutationKey: ["submit-borrow-request"],
		mutationFn: createBorrowRequest,
	});

	async function onSubmit(value: CreateBorrowRequest): Promise<void> {
		const equipmentsPayload = props.selectedEquipments.map((item) => ({
			equipmentTypeId: item.equipment.id,
			quantity: item.quantity,
		}));

		value.equipments = equipmentsPayload;
		mutation.mutate(value);
	}

	const totalQuantity = props.selectedEquipments.reduce(
		(total, cur) => total + cur.quantity,
		0,
	);

	function reset(): void {
		mutation.reset();
		props.reset();
	}

	const isToday = (date: Date) => {
		const today = new Date();
		return (
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear()
		);
	};

	const getMinClaimTime = (date: Date) => {
		if (isToday(date)) {
			const minTime = new Date(Date.now() + 1 * 60 * 60 * 1000);
			return minTime.toLocaleTimeString("en-GB", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
			});
		}
		return undefined;
	};

	const getMinReturnTime = (date: Date) => {
		if (isToday(date)) {
			const minTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
			return minTime.toLocaleTimeString("en-GB", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
			});
		}
		return undefined;
	};

	if (mutation.isPending) {
		return <FullScreenLoading />;
	}

	if (mutation.isSuccess) {
		return (
			<Success
				header="Borrow request submitted successfully"
				backLink="/equipments"
				fn={reset}
			/>
		);
	}

	if (mutation.isError) {
		return (
			<Failed
				header="Borrow request failed."
				backLink="/equipments"
				backMessage="or return to Catalog"
				fn={reset}
				retry={form.handleSubmit(onSubmit)}
			/>
		);
	}

	return (
		<div className="h-full w-full">
			<Button
				variant="ghost"
				size="icon"
				className="size-15"
				onClick={() => props.setIsBorrowing(false)}
			>
				<IconArrowLeft className="size-8" />
			</Button>

			<main className="pb-10">
				<div className="h-full w-full flex flex-col gap-12">
					<H1 className="text-center">Selected Equipments</H1>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-4"
							id="borrow-request-form"
						>
							<section className="space-y-2">
								{props.selectedEquipments.map((selectedEquipment) => {
									const equipment = selectedEquipment.equipment;
									const equipmentImage = equipment.imageUrl
										? `${BACKEND_URL}${equipment.imageUrl}`
										: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

									return (
										<div
											key={equipment.id}
											className="flex items-center gap-2 justify-between bg-card rounded-2xl p-4 shadow-item"
										>
											<div className="flex items-center gap-2 w-full">
												<img
													src={equipmentImage}
													alt={`${equipment.name} ${equipment.brand}`}
													className="size-20 object-cover"
												/>

												<div className="flex flex-col">
													<LabelLarge>
														{equipment.brand || "No Brand"}
														{equipment.model ? ` ${equipment.model}` : null}
													</LabelLarge>

													<LabelSmall className="text-muted">
														{equipment.name}
													</LabelSmall>
												</div>
											</div>

											<NumberInput
												onChange={(v) =>
													props.handleUpdateQuantity(equipment, v)
												}
												maxValue={equipment.quantity}
											/>
										</div>
									);
								})}
							</section>

							<Separator />

							<FormField
								control={form.control}
								name="location"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Location</FormLabel>
										<FormControl>
											<Input placeholder="ex. Volleyball Court" {...field} />
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
											<Input placeholder="ex. PE Class" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="expectedClaimAt"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Date and Time to Claim</FormLabel>
										<div className="flex gap-2">
											<Popover
												open={openClaimCalendar}
												onOpenChange={setOpenClaimCalendar}
											>
												<PopoverTrigger asChild>
													<Button
														type="button"
														variant="outline"
														className="flex-1 justify-between bg-card font-open-sans text-base text-foreground border-accent"
													>
														{field.value
															? field.value.toLocaleDateString()
															: "Select date"}
														<ChevronDownIcon className="h-4 w-4" />
													</Button>
												</PopoverTrigger>
												<PopoverContent
													className="w-auto overflow-hidden p-0"
													align="start"
												>
													<Calendar
														mode="single"
														selected={field.value}
														captionLayout="dropdown"
														onSelect={(date) => {
															if (date) {
																const current = field.value;
																date.setHours(
																	current.getHours(),
																	current.getMinutes(),
																);
																field.onChange(date);
																setOpenClaimCalendar(false);
															}
														}}
														disabled={(date) =>
															date < new Date(new Date().setHours(0, 0, 0, 0))
														}
													/>
												</PopoverContent>
											</Popover>

											<Input
												type="time"
												step="60"
												value={field.value.toLocaleTimeString("en-GB", {
													hour: "2-digit",
													minute: "2-digit",
													hour12: false,
												})}
												min={getMinClaimTime(field.value)}
												onChange={(e) => {
													const [hours, minutes] = e.target.value.split(":");
													const newDate = new Date(field.value);
													newDate.setHours(
														parseInt(hours, 10),
														parseInt(minutes, 10),
													);
													field.onChange(newDate);
												}}
												className="flex-1"
											/>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="expectedReturnAt"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Date and Time to Return</FormLabel>
										<div className="flex gap-2">
											<Popover
												open={openReturnCalendar}
												onOpenChange={setOpenReturnCalendar}
											>
												<PopoverTrigger asChild>
													<Button
														type="button"
														variant="outline"
														className="flex-1 justify-between bg-card font-open-sans text-base text-foreground border-accent"
													>
														{field.value
															? field.value.toLocaleDateString()
															: "Select date"}
														<ChevronDownIcon className="h-4 w-4" />
													</Button>
												</PopoverTrigger>
												<PopoverContent
													className="w-auto overflow-hidden p-0"
													align="start"
												>
													<Calendar
														mode="single"
														selected={field.value}
														captionLayout="dropdown"
														onSelect={(date) => {
															if (date) {
																const current = field.value;
																date.setHours(
																	current.getHours(),
																	current.getMinutes(),
																);
																field.onChange(date);
																setOpenReturnCalendar(false);
															}
														}}
														disabled={(date) =>
															date < new Date(new Date().setHours(0, 0, 0, 0))
														}
													/>
												</PopoverContent>
											</Popover>

											<Input
												type="time"
												step="60"
												value={field.value.toLocaleTimeString("en-GB", {
													hour: "2-digit",
													minute: "2-digit",
													hour12: false,
												})}
												min={getMinReturnTime(field.value)}
												onChange={(e) => {
													const [hours, minutes] = e.target.value.split(":");
													const newDate = new Date(field.value);
													newDate.setHours(
														parseInt(hours, 10),
														parseInt(minutes, 10),
													);
													field.onChange(newDate);
												}}
												className="flex-1"
											/>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="agreedToPolicy"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center space-x-1 space-y-0">
										<FormControl>
											<Checkbox
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
										<div className="space-y-1 leading-none">
											<FormLabel className="font-montserrat-medium data-[error=true]:text-destructive">
												<p>
													I have read and agreed to the{" "}
													<a
														href="https://docs.google.com/document/d/1GxszQoxUPmQq0sthSyEe9qRqnNHkvac6yJC0uFdBOgs/edit?usp=sharing"
														target="_blank"
														rel="noreferrer"
														className="font-montserrat-semibold underline"
													>
														Sports Equipment Borrowing Policy
													</a>
												</p>
											</FormLabel>
										</div>
									</FormItem>
								)}
							/>

							<Dialog>
								<DialogTrigger asChild>
									<Button
										type="button"
										className="w-full shadow-md"
										onClick={async () => {
											const result = await form.trigger();
											if (!result) {
												const firstError = Object.keys(form.formState.errors)[0];
												form.setFocus(firstError as any);
											}
										}}
									>
										Borrow Equipments
									</Button>
								</DialogTrigger>

								{form.formState.isValid && (
									<DialogContent>
										<DialogHeader>
											<DialogTitle className="text-start">
												Confirm Equipment Borrow
											</DialogTitle>
											<DialogDescription className="text-start">
												You are about to borrow {totalQuantity} items. Do you wish
												to proceed?
											</DialogDescription>
										</DialogHeader>

										<DialogFooter>
											<DialogClose asChild>
												<Button type="button" variant="secondary">
													Cancel
												</Button>
											</DialogClose>

											<Button type="submit" form="borrow-request-form">
												Confirm
											</Button>
										</DialogFooter>
									</DialogContent>
								)}
							</Dialog>

							<Button
								type="button"
								className="w-full shadow-md"
								onClick={() => props.setIsBorrowing(false)}
								variant="secondary"
							>
								Cancel
							</Button>
						</form>
					</Form>
				</div>
			</main>
		</div>
	);
}
