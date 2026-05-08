import { H1, LabelSmall, TitleSmall } from "@/components/typography";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { useRegister } from "../../-context";

export const Route = createFileRoute("/_auth/_register/register/password/")({
	component: RouteComponent,
});

const hasUppercase = (str: string) => /[A-Z]/.test(str);
const hasLowercase = (str: string) => /[a-z]/.test(str);
const hasNumber = (str: string) => /[0-9]/.test(str);
const hasSpecialChar = (str: string) => /[!@#$%^&*()]/.test(str);

const validationRules = [
	{ label: "Minimum of 8 characters", check: (str: string) => str.length >= 8 },
	{ label: "At least 1 uppercase letter (A-Z)", check: hasUppercase },
	{ label: "At least 1 lowercase letter (a-z)", check: hasLowercase },
	{ label: "At least 1 number (0-9)", check: hasNumber },
	{ label: "At least 1 special character (!@#$%^&*)", check: hasSpecialChar },
];

const formSchema = z
	.object({
		password: z
			.string()
			.nonempty()
			.min(8, "Password requirements not met.")
			.refine(hasUppercase, "Password requirements not met.")
			.refine(hasLowercase, "Password requirements not met.")
			.refine(hasNumber, "Password requirements not met.")
			.refine(hasSpecialChar, "Password requirements not met."),
		confirmPassword: z.string().nonempty(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Password and Confirm Password do not match",
		path: ["confirmPassword"],
	});

export type RegisterPasswordSchema = z.infer<typeof formSchema>;

function RouteComponent(): JSX.Element {
	const navigate = Route.useNavigate();
	const registerContext = useRegister();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			password: registerContext.value.password,
			confirmPassword: registerContext.value.confirmPassword,
		},
		mode: "onTouched",
	});

	const password = form.watch("password");

	async function onSubmit(value: z.infer<typeof formSchema>): Promise<void> {
		registerContext.setValue((prev) => ({
			...prev,
			...value,
		}));

		await navigate({ to: "/register/personal" });
	}

	return (
		<div className="h-full w-full flex flex-col gap-15">
			<section className="space-y-1 content-center flex flex-col justify-center items-center">
				<H1 className="text-center">Enter your Password</H1>
				<TitleSmall className="text-center">
					Enter your password to secure your account.
				</TitleSmall>
			</section>

			<section className="h-full">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7.5">
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Password</FormLabel>
										<FormControl>
											<PasswordInput
												placeholder="Enter your Password"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="bg-card rounded-xl border p-6">
								{validationRules.map((rule, i) => {
									const isMet = rule.check(password);

									return (
										<LabelSmall
											key={i}
											className={isMet ? "text-success" : "text-muted"}
										>
											{rule.label}
										</LabelSmall>
									);
								})}
							</div>

							<FormField
								control={form.control}
								name="confirmPassword"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Confirm Password</FormLabel>
										<FormControl>
											<PasswordInput
												placeholder="Confirm your Password"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<Button
							type="submit"
							className="w-full"
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
