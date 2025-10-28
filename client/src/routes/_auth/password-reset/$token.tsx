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

export const Route = createFileRoute("/_auth/password-reset/$token")({
	component: RouteComponent,
});

const formSchema = z
	.object({
		token: z.string().nonempty(),
		newPassword: z.string().nonempty(),
		confirmPassword: z.string().nonempty(),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords do not match",
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

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="newPassword"
					render={({ field }) => (
						<FormItem>
							<FormLabel>New Password</FormLabel>
							<FormControl>
								<Input type="password" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="confirmPassword"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Confirm Password</FormLabel>
							<FormControl>
								<Input type="password" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type="submit" className="w-full">
					Reset Password
				</Button>
			</form>
		</Form>
	);
}
