import { BACKEND_URL, type ApiResponse } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { H1, LabelSmall, TitleSmall } from "@/components/typography";
import { IconArrowLeft } from "@/lib/icons";

export const Route = createFileRoute("/_auth/password-reset/$token")({
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
		token: z.string().nonempty(),
		newPassword: z
			.string()
			.nonempty({ error: "This field must not be left blank." })
			.min(8, "Password requirements not met.")
			.refine(hasUppercase, "Password requirements not met.")
			.refine(hasLowercase, "Password requirements not met.")
			.refine(hasNumber, "Password requirements not met.")
			.refine(hasSpecialChar, "Password requirements not met."),
		confirmPassword: z
			.string()
			.nonempty({ error: "This field must not be left blank." }),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Password and Confirm Password do not match",
		path: ["confirmPassword"],
	});

async function resetPassword(
	value: z.infer<typeof formSchema>,
): Promise<ApiResponse> {
	const response = await fetch(`${BACKEND_URL}/password-reset`, {
		method: "POST",
		body: JSON.stringify(value),
		headers: { "Content-Type": "application/json" },
	});

	const result: ApiResponse = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result;
}

function RouteComponent() {
	const params = Route.useParams();
	const navigate = Route.useNavigate();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			token: params.token,
			newPassword: "",
			confirmPassword: "",
		},
		mode: "onTouched",
	});

	const mutation = useMutation({
		mutationFn: resetPassword,
		onMutate: () => {
			return toast.loading("Resetting password");
		},
		onSuccess: async (result, _variables, toastId) => {
			toast.success(result.message, { id: toastId });
			await navigate({ to: "/login" });
		},
		onError: (error, _variables, toastId) => {
			toast.error(error.message, { id: toastId });
		},
	});

	async function onSubmit(value: z.infer<typeof formSchema>): Promise<void> {
		mutation.mutate(value);
	}

	const newPassword = form.watch("newPassword");

	return (
		<div className="h-full w-full">
			<Button variant="ghost" size="icon" className="size-15">
				<IconArrowLeft className="size-8" />
			</Button>

			<main className="mt-10 pb-10">
				<div className="h-full w-full flex flex-col gap-15">
					<section className="space-y-1 content-center flex flex-col justify-center items-center">
						<H1 className="text-center">Enter your new password</H1>
						<TitleSmall className="text-center">
							Enter your password to secure your account.
						</TitleSmall>
					</section>

					<section className="h-full">
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className="space-y-8"
							>
								<div className="space-y-4">
									<FormField
										control={form.control}
										name="newPassword"
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
											const isMet = rule.check(newPassword);

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
			</main>
		</div>
	);
}
