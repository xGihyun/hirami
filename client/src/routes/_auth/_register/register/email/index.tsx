import { H1, LabelSmall, TitleSmall } from "@/components/typography";
import { registerIllustration } from "@/lib/assets";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { useRegister } from "../../-context";

export const Route = createFileRoute("/_auth/_register/register/email/")({
	component: RouteComponent,
});

const formSchema = z.object({
	email: z
		.string()
		.nonempty({ error: "This field must not be left blank." })
		.email({ error: "Invalid email format." }),
});

export type RegisterEmailSchema = z.infer<typeof formSchema>;

function RouteComponent(): JSX.Element {
	const navigate = Route.useNavigate();
	const registerContext = useRegister();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: registerContext.value.email,
		},
		mode: "onTouched",
	});

	async function onSubmit(value: z.infer<typeof formSchema>): Promise<void> {
		registerContext.setValue((prev) => ({
			...prev,
			...value,
		}));

		await navigate({ to: "/register/password" });
	}

	return (
		<div className="h-full w-full flex flex-col gap-12">
			<section className="space-y-3.5 content-center flex flex-col justify-center items-center h-full">
				<img
					src={registerIllustration}
					alt="Register illustration"
					className="w-full max-w-xs mx-auto"
				/>

				<div className="space-y-1.5">
					<H1 className="text-center">Register</H1>
					<TitleSmall className="text-center">
						Enter your details to create an account.
					</TitleSmall>
				</div>
			</section>

			<section className="h-full">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7.5">
						<FormField
							control={form.control}
							name="email"
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

						<Button
							type="submit"
							className="w-full"
							disabled={!form.formState.isValid}
						>
							Confirm
						</Button>
					</form>
				</Form>

				<LabelSmall className="text-center mt-4">
					Have an account?{" "}
					<Link to="/login" className="font-montserrat-bold underline">
						Login
					</Link>
				</LabelSmall>
			</section>
		</div>
	);
}
