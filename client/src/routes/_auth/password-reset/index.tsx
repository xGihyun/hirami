import { BACKEND_URL, type ApiResponse } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { IconArrowLeft } from "@/lib/icons";
import { passwordResetIllustration } from "@/lib/assets";
import { H1, TitleSmall } from "@/components/typography";

export const Route = createFileRoute("/_auth/password-reset/")({
	component: RouteComponent,
});

const formSchema = z.object({
	email: z
		.string()
		.nonempty({ error: "This field must not be left blank." })
		.email({ error: "Invalid email format." }),
});

async function requestPasswordReset(
	value: z.infer<typeof formSchema>,
): Promise<ApiResponse> {
	const response = await fetch(`${BACKEND_URL}/password-reset-request`, {
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
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
		},
		mode: "onTouched",
	});

	const mutation = useMutation({
		mutationFn: requestPasswordReset,
		onMutate: () => {
			return toast.loading("Requesting for password reset.");
		},
		onSuccess: (result, _variables, toastId) => {
			toast.success("A password reset link has been sent to your email.", { id: toastId });
		},
		onError: (error, _variables, toastId) => {
			toast.error(error.message, { id: toastId });
		},
	});

	async function onSubmit(value: z.infer<typeof formSchema>): Promise<void> {
		mutation.mutate(value);
	}

	return (
		<div className="h-full w-full">
			<Button variant="ghost" size="icon" className="size-15">
				<Link to="/onboarding">
					<IconArrowLeft className="size-8" />
				</Link>
			</Button>

			<main className="mt-10 pb-10">
				<div className="h-full w-full flex flex-col gap-12">
					<section className="space-y-3.5 content-center flex flex-col justify-center items-center h-full">
						<img
							src={passwordResetIllustration}
							alt="Password reset illustration"
							className="w-full max-w-52 mx-auto aspect-[208/167]"
						/>

						<div className="space-y-1.5">
							<H1 className="text-center">Forgot Password?</H1>
							<TitleSmall className="text-center">
								Enter your email to proceed.
							</TitleSmall>
						</div>
					</section>

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

							<Button type="submit" className="w-full">
								Verify
							</Button>
						</form>
					</Form>
				</div>
			</main>
		</div>
	);
}
