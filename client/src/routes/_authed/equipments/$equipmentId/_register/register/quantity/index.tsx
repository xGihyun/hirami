import { createFileRoute } from "@tanstack/react-router";
import { H1, LabelMedium, TitleSmall } from "@/components/typography";
import { addFilesIllustration } from "@/lib/assets";
import z from "zod";
import { type JSX } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChevronDownIcon } from "lucide-react";
import {
	useRegisterEquipment,
	type RegisterEquipmentData,
} from "../../-context";

export const Route = createFileRoute(
	"/_authed/equipments/$equipmentId/_register/register/quantity/",
)({
	component: RouteComponent,
});

const registerEquipmentQuantitySchema = z.object({
	acquisitionDate: z.date(),
	quantity: z.number().positive(),
});

export type RegisterEquipmentQuantitySchema = z.infer<typeof registerEquipmentQuantitySchema>;

function RouteComponent(): JSX.Element {
	const navigate = Route.useNavigate();

	const registerEquipmentContext = useRegisterEquipment();

	const form = useForm<RegisterEquipmentQuantitySchema>({
		resolver: zodResolver(registerEquipmentQuantitySchema),
		defaultValues: {
			quantity: registerEquipmentContext.value.quantity,
			acquisitionDate: registerEquipmentContext.value.acquisitionDate,
		},
		mode: "onTouched",
	});

	async function onSubmit(
		value: RegisterEquipmentQuantitySchema,
	): Promise<void> {
		const data: RegisterEquipmentData = {
			...registerEquipmentContext.value,
			...value,
		};
		registerEquipmentContext.setValue(data);

		await navigate({ to: "/equipments/$equipmentId/register/image" });
	}

	return (
		<div className="h-full w-full flex flex-col gap-12">
			<section className="space-y-3.5 content-center flex flex-col justify-center items-center h-full">
				<img
					src={addFilesIllustration}
					alt="Add files illustration"
					className="w-full max-w-52 mx-auto aspect-[223/200]"
				/>

				<div className="space-y-1.5">
					<H1 className="text-center">Quantity</H1>
					<TitleSmall className="text-center">
						Set the desired quantity for your equipment.
					</TitleSmall>
				</div>
			</section>

			<section className="h-full">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7.5">
						<section className="space-y-4">
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
							disabled={!form.formState.isValid}
						>
							Confirm
						</Button>
					</form>
				</Form>
			</section>
		</div>
	);
}
