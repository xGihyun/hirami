import { createFileRoute } from "@tanstack/react-router";
import { H1, TitleSmall } from "@/components/typography";
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
import { useRegisterEquipment } from "../../-context";

export const Route = createFileRoute(
	"/_authed/equipments/$equipmentId/_register/register/name/",
)({
	component: RouteComponent,
});

const registerEquipmentNameSchema = z.object({
	name: z.string().nonempty(),
	brand: z.string().optional(),
	model: z.string().optional(),
});

export type RegisterEquipmentNameSchema = z.infer<
	typeof registerEquipmentNameSchema
>;

function RouteComponent(): JSX.Element {
	const navigate = Route.useNavigate();

	const registerEquipmentContext = useRegisterEquipment();

	const form = useForm<RegisterEquipmentNameSchema>({
		resolver: zodResolver(registerEquipmentNameSchema),
		defaultValues: {
			name: registerEquipmentContext.value.name,
			brand: registerEquipmentContext.value.brand,
			model: registerEquipmentContext.value.model,
		},
		mode: "onTouched",
	});

	async function onSubmit(value: RegisterEquipmentNameSchema): Promise<void> {
		registerEquipmentContext.setValue((prev) => ({
			...prev,
			...value,
		}));

		await navigate({ to: "/equipments/$equipmentId/register/quantity" });
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
					<H1 className="text-center">Register Equipment</H1>
					<TitleSmall className="text-center">
						Begin registering your equipment by providing the necessary
						information.
					</TitleSmall>
				</div>
			</section>

			<section className="h-full">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7.5">
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
