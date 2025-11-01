import type { JSX } from "react";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { BACKEND_URL, type ApiResponse } from "@/lib/api";
import type { User } from "@/lib/user";
import { useMutation } from "@tanstack/react-query";
import { setCookie } from "@/lib/cookie";
import { loginIllustration } from "@/lib/assets";
import { H1, LabelSmall, TitleSmall } from "@/components/typography";
import { PasswordInput } from "@/components/password-input";

const formSchema = z.object({
	email: z
		.string()
		.nonempty({ error: "This field must not be left blank." })
		.email({ error: "Invalid email format." }),
	password: z
		.string()
		.nonempty({ error: "This field must not be left blank." }),
});

type LoginResponse = {
	user: User;
	token: string;
};

async function login(
	value: z.infer<typeof formSchema>,
): Promise<ApiResponse<LoginResponse>> {
	console.log(BACKEND_URL);
	const response = await fetch(`${BACKEND_URL}/login`, {
		method: "POST",
		body: JSON.stringify(value),
		headers: { "Content-Type": "application/json" },
	});

	const result: ApiResponse<LoginResponse> = await response.json();
	if (!response.ok) {
		throw new Error(result.message || "Login failed");
	}

	return result;
}

export function LoginForm(): JSX.Element {
	const navigate = useNavigate({ from: "/login" });
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
		},
		mode: "onTouched",
	});

	const mutation = useMutation({
		mutationFn: login,
		onMutate: () => {
			return toast.loading("Logging in");
		},
		onSuccess: (result, _variables, toastId) => {
			setCookie("session", result.data.token);
			toast.success("Login successful.", { id: toastId });
			navigate({ to: "/equipments" });
		},
		onError: (error, _variables, toastId) => {
			toast.error(error.message, { id: toastId });
		},
	});

	async function onSubmit(value: z.infer<typeof formSchema>): Promise<void> {
		mutation.mutate(value);
	}

	return (
		<div className="h-full w-full flex flex-col gap-12">
			<section className="space-y-3.5 content-center flex flex-col justify-center items-center h-full">
				<img
					src={loginIllustration}
					alt="Login illustration"
					className="w-full max-w-52 mx-auto"
				/>

				<div className="space-y-1.5">
					<H1 className="text-center">Log In</H1>
					<TitleSmall className="text-center">
						Enter your email and password to proceed.
					</TitleSmall>
				</div>
			</section>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
					<div className="space-y-4">
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
					</div>

					<Button
						type="submit"
						className="w-full"
						disabled={!form.formState.isValid}
					>
						Log In
					</Button>

					<LabelSmall className="text-center">
						Forgot password?{" "}
						<Link
							to="/password-reset"
							className="font-montserrat-bold underline"
						>
							Click here
						</Link>
					</LabelSmall>
				</form>
			</Form>
		</div>
	);
}
