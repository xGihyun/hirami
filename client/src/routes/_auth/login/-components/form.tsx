import { type JSX } from "react";
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
import { BACKEND_URL, type ApiResponse, protectedFetch } from "@/lib/api";
import type { User } from "@/lib/user";
import { useMutation } from "@tanstack/react-query";
import { setCookie } from "@/lib/cookie";
import { accessDeniedIllustration, loginIllustration } from "@/lib/assets";
import {
	DisplayLarge,
	H1,
	LabelLarge,
	LabelSmall,
	TitleSmall,
} from "@/components/typography";
import { PasswordInput } from "@/components/password-input";
import { ComponentLoading, FullScreenLoading } from "@/components/loading";
import { HiramiLogoDark } from "@/lib/assets/logo-dark";
import { Failed } from "@/components/failed";
import { ErrInvalidCredentials, ErrAccountNotVerified } from "@/lib/user/error";

const formSchema = z.object({
	email: z.string().nonempty().email({ error: "Invalid email format." }),
	password: z.string().nonempty(),
});

type LoginResponse = {
	user: User;
	token: string;
};

async function login(
	value: z.infer<typeof formSchema>,
): Promise<ApiResponse<LoginResponse>> {
	console.log(BACKEND_URL);
	const response = await protectedFetch(`${BACKEND_URL}/login`, {
		method: "POST",
		body: JSON.stringify(value),
		headers: { "Content-Type": "application/json" },
	});

	const result: ApiResponse<LoginResponse> = await response.json();
	if (response.status === 401) {
		throw new ErrInvalidCredentials("Incorrect email or password.");
	}

	if (response.status === 403) {
		throw new ErrAccountNotVerified(
			result.message || "Your account is not verified. Please check your email.",
		);
	}

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
		onSuccess: async (result) => {
			setCookie("session", result.data.token, {
				path: "/",
				maxAge: 7 * 24 * 60 * 60,
				sameSite: "Strict",
			});
			await navigate({ to: "/equipments" });
		},
	});

	async function onSubmit(value: z.infer<typeof formSchema>): Promise<void> {
		mutation.mutate(value);
	}

	if (
		mutation.isError &&
		!(mutation.error instanceof ErrInvalidCredentials) &&
		!(mutation.error instanceof ErrAccountNotVerified)
	) {
		return (
			<Failed
				header="Login failed."
				fn={mutation.reset}
				retry={form.handleSubmit(onSubmit)}
				backLink="/login"
				backMessage="or return to Log in page"
				illustration={accessDeniedIllustration}
                className="md:bg-background md:p-5 fixed inset-0"
			/>
		);
	}

	if (mutation.isPending) {
		return (
			<div className="flex h-full items-center justify-center ">
				<FullScreenLoading className="md:hidden block" />
				<ComponentLoading className="md:block hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
			</div>
		);
	}

	return (
		<div className="h-full w-full flex flex-col gap-12">
			<section className="space-y-3.5 content-center flex flex-col justify-center items-center h-full">
				<div className="w-full max-w-60 mx-auto">
					<img
						src={loginIllustration}
						alt="Login illustration"
						className="w-full max-w-52 mx-auto aspect-square block md:hidden"
					/>

					<HiramiLogoDark className="hidden md:block w-full h-fit" />
				</div>

				<div className="space-y-1.5">
					<H1 className="text-center block md:hidden">Log In</H1>
					<DisplayLarge className="text-center hidden md:block">
						Hirami
					</DisplayLarge>
					<TitleSmall className="text-center">
						Log in or sign up to get started.
					</TitleSmall>
				</div>
			</section>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-15">
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

					<div className="space-y-4">
						{mutation.error instanceof ErrInvalidCredentials ? (
							<p
								data-slot="form-message"
								className="text-destructive font-montserrat-semibold text-xs leading-4 text-center"
							>
								{mutation.error.message}
							</p>
						) : null}

						{mutation.error instanceof ErrAccountNotVerified ? (
							<div className="text-center space-y-1">
								<p
									data-slot="form-message"
									className="text-destructive font-montserrat-semibold text-xs leading-4"
								>
									{mutation.error.message}
								</p>
								<button
									type="button"
									className="text-xs text-primary underline"
									onClick={() =>
										navigate({
											to: "/check-email",
											search: { email: form.getValues("email") },
										})
									}
								>
									Resend verification email
								</button>
							</div>
						) : null}

						<Button
							type="submit"
							className="w-full"
							disabled={!form.formState.isValid}
						>
							Log In
						</Button>

						<div className="text-center flex gap-1 justify-center items-center w-full mx-auto">
							<LabelSmall>Forgot password?</LabelSmall>
							<Link to="/password-reset">
								<LabelLarge className="underline">Click here</LabelLarge>
							</Link>
						</div>
					</div>
				</form>
			</Form>
		</div>
	);
}
