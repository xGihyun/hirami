import { H1, TitleSmall } from "@/components/typography";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
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
import { IMAGE_FORMATS, IMAGE_SIZE_LIMIT } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister, type RegisterData } from "../../-context";

export const Route = createFileRoute("/_auth/_register/register/personal/")({
	component: RouteComponent,
});

const formSchema = z.object({
	firstName: z.string().nonempty(),
	middleName: z.string().optional(),
	lastName: z.string().nonempty(),
	avatar: z
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

export type RegisterPersonalSchema = z.infer<typeof formSchema>;

function RouteComponent(): JSX.Element {
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			firstName: "",
			middleName: "",
			lastName: "",
		},
	});

	const registerContext = useRegister();

	async function onSubmit(value: z.infer<typeof formSchema>): Promise<void> {
		const completeData: RegisterData = {
			...registerContext.value,
			...value,
		};
		registerContext.setValue((prev) => ({
			...prev,
			...value,
		}));

        console.log(completeData)
	}

	return (
		<div className="h-full w-full flex flex-col gap-12">
			<section className="space-y-1 content-center flex flex-col justify-center items-center pt-18">
				<H1 className="text-center">Complete your profile</H1>
			</section>

			<section className="h-full">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7.5">
						<FormField
							control={form.control}
							name="firstName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input placeholder="youremail@gmail.com" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type="submit" className="w-full" variant="outline">
							Confirm
						</Button>
					</form>
				</Form>
			</section>
		</div>
	);
}
