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
import type { ApiResponse } from "@/lib/api";
import type { User } from "@/lib/user";
import { useMutation } from "@tanstack/react-query";
import { setCookie } from "@/lib/cookie";

const formSchema = z.object({
	email: z.email(),
	password: z.string().nonempty(),
});

type LoginResponse = {
	user: User;
	token: string;
};

async function login(
	value: z.infer<typeof formSchema>,
): Promise<ApiResponse<LoginResponse>> {
	const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/login`, {
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
	});

	const mutation = useMutation({
		mutationFn: login,
		onMutate: () => {
			return toast.loading("Logging in");
		},
		onSuccess: (result, _variables, toastId) => {
			setCookie("session", result.data.token);
			toast.success(result.message, { id: toastId });
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
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
								<Input
									type="password"
									placeholder="Enter your password"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type="submit">Login</Button>

				<p className="text-center">
					Don't have an account?{" "}
					<Link to="/register" className="text-primary underline">
						Register
					</Link>
				</p>
			</form>
		</Form>
	);
}
