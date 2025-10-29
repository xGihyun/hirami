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
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	BACKEND_URL,
	IMAGE_FORMATS,
	IMAGE_SIZE_LIMIT,
	type ApiResponse,
} from "@/lib/api";
import { useMutation } from "@tanstack/react-query";

const formSchema = z.object({
	email: z.email(),
	password: z.string().nonempty(),
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

async function register(
	value: z.infer<typeof formSchema>,
): Promise<ApiResponse> {
	const formData = new FormData();
	formData.append("email", value.email);
	formData.append("password", value.password);
	formData.append("firstName", value.firstName);
	if (value.middleName) formData.append("middleName", value.middleName);
	formData.append("lastName", value.lastName);
	if (value.avatar) formData.append("avatar", value.avatar);

	const response = await fetch(`${BACKEND_URL}/register`, {
		method: "POST",
		body: formData,
	});

	const result: ApiResponse = await response.json();
	if (!response.ok) {
		throw new Error(result.message || "Register failed");
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
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

				<FormField
					control={form.control}
					name="avatar"
					render={({ field: { value, onChange, ...fieldProps } }) => (
						<FormItem>
							<FormLabel>Avatar</FormLabel>
							<FormControl>
								<Input
									{...fieldProps}
									type="file"
									accept="image/jpeg,image/jpg,image/png"
									onChange={(e) => {
										const file = e.target.files?.[0];
										onChange(file);
									}}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type="submit" className="w-full">
					Register
				</Button>
			</form>
		</Form>
	);
}
