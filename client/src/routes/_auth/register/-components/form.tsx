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
import { useMutation } from "@tanstack/react-query";
// import { fetch } from '@tauri-apps/plugin-http';

const formSchema = z.object({
	email: z.email(),
	password: z.string().nonempty(),
	firstName: z.string().nonempty(),
	middleName: z.string().optional(),
	lastName: z.string().nonempty(),
});

async function register(
	value: z.infer<typeof formSchema>,
): Promise<ApiResponse> {
	const response = await fetch(`${BACKEND_URL}/register`, {
		method: "POST",
		body: JSON.stringify(value),
		headers: { "Content-Type": "application/json" },
	});

	const result: ApiResponse = await response.json();
	if (!response.ok) {
		throw new Error(result.message || "Login failed");
	}

	return result;
}

export function RegisterForm(): JSX.Element {
	const navigate = useNavigate({ from: "/register" });
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
			firstName: "",
			middleName: "",
			lastName: "",
		},
	});

	const mutation = useMutation({
		mutationFn: register,
		onMutate: () => {
			return toast.loading("Creating account");
		},
		onSuccess: (data, _variables, toastId) => {
			toast.success(data.message, { id: toastId });
			navigate({ to: "/login" });
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

				<FormField
					control={form.control}
					name="firstName"
					render={({ field }) => (
						<FormItem>
							<FormLabel>First Name</FormLabel>
							<FormControl>
								<Input placeholder="Enter your first name" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="middleName"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Middle Name</FormLabel>
							<FormControl>
								<Input placeholder="Enter your middle name" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="lastName"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Last Name</FormLabel>
							<FormControl>
								<Input placeholder="Enter your last name" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type="submit">Register</Button>

				<p className="text-center">
					Have an account?{" "}
					<Link to="/login" className="text-primary underline">
						Login
					</Link>
				</p>
			</form>
		</Form>
	);
}
