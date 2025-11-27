import type { Dispatch, JSX, SetStateAction } from "react";
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BACKEND_URL } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import type { SelectedEquipment } from "..";
import { useAuth } from "@/auth";
import { H1, LabelLarge, LabelSmall } from "@/components/typography";
import { Separator } from "@/components/ui/separator";
import type { Equipment } from "@/lib/equipment";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { IconArrowLeft } from "@/lib/icons";
import { NumberInput } from "@/components/number-input";
import {
	borrow,
	borrowRequestSchema,
	type BorrowRequestSchema,
} from "../-function";
import { DialogClose } from "@radix-ui/react-dialog";
import { Success } from "@/components/success";
import { FullScreenLoading } from "@/components/loading";
import { Failed } from "@/components/failed";

type BorrowEquipmentFormProps = {
	selectedEquipments: SelectedEquipment[];
	handleUpdateQuantity: (equipment: Equipment, newQuantity: number) => void;
	onSuccess: () => void;
	setIsBorrowing: Dispatch<SetStateAction<boolean>>;
};

export function BorrowEquipmentForm(
	props: BorrowEquipmentFormProps,
): JSX.Element {
	const auth = useAuth();
	const [openCalendar, setOpenCalendar] = useState(false);
	const now = new Date();

	const form = useForm<BorrowRequestSchema>({
		resolver: zodResolver(borrowRequestSchema),
		defaultValues: {
			equipments: [],
			expectedReturnAt: now,
			location: "",
			purpose: "",
			requestedBy: auth.user?.id,
		},
		mode: "onTouched",
	});

	const mutation = useMutation({
		mutationKey: ["submit-borrow-request"],
		mutationFn: borrow,
		onSuccess: async (_data, _variables) => {
			props.onSuccess();
		},
	});

	async function onSubmit(value: BorrowRequestSchema): Promise<void> {
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

	if (mutation.isPending) {
		return <FullScreenLoading />;
	}

	if (mutation.isSuccess) {
		return (
			<Success
				header="Borrow request submitted successfully"
				backLink="/equipments"
			/>
		);
	}

	if (mutation.isError) {
		return (
			<Failed
				header="Borrow request failed."
				backLink="/equipments"
				backMessage="or return to Catalog"
				fn={mutation.reset}
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
														{equipment.brand}
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
								name="expectedReturnAt"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Date and Time to Return</FormLabel>
										<div className="flex gap-2">
											<Popover
												open={openCalendar}
												onOpenChange={setOpenCalendar}
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
																setOpenCalendar(false);
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

							<Dialog>
								<DialogTrigger asChild>
									<Button
										type="button"
										className="w-full shadow-md"
										disabled={!form.formState.isValid}
									>
										Borrow Equipments
									</Button>
								</DialogTrigger>

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

										<Button
											disabled={!form.formState.isValid}
											type="submit"
											form="borrow-request-form"
										>
											Confirm
										</Button>
									</DialogFooter>
								</DialogContent>
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
