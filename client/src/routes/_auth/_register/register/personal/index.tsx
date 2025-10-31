import {
	H1,
	LabelLarge,
	LabelMedium,
	TitleSmall,
} from "@/components/typography";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type JSX } from "react";
import { set, useForm } from "react-hook-form";
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
import {
	BACKEND_URL,
	IMAGE_FORMATS,
	IMAGE_SIZE_LIMIT,
	type ApiResponse,
} from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister, type RegisterData } from "../../-context";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconEdit, IconUserPen } from "@/lib/icons";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { accessDeniedIllustration, doneIllustration } from "@/lib/assets";

export const Route = createFileRoute("/_auth/_register/register/personal/")({
	component: RouteComponent,
});

const formSchema = z.object({
	firstName: z
		.string()
		.nonempty({ error: "This field must not be left blank." }),
	middleName: z.string().optional(),
	lastName: z
		.string()
		.nonempty({ error: "This field must not be left blank." }),
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

export type RegisterPersonalSchema = z.infer<typeof formSchema>;

async function register(value: RegisterData): Promise<ApiResponse> {
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

function RouteComponent(): JSX.Element {
	const navigate = Route.useNavigate();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			firstName: "",
			middleName: "",
			lastName: "",
		},
	});

	const [status, setStatus] = useState<"success" | "failed" | "pending" | null>(
		null,
	);

	const mutation = useMutation({
		mutationFn: register,
		onMutate: () => {
			setStatus("pending");
			return toast.loading("Creating account");
		},
		onSuccess: (data, _variables, toastId) => {
			setStatus("success");
			toast.success(data.message, { id: toastId });
			navigate({ to: "/login" });
		},
		onError: (error, _variables, toastId) => {
			setStatus("failed");
			toast.error(error.message, { id: toastId });
		},
	});

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const registerContext = useRegister();

	async function onSubmit(value: z.infer<typeof formSchema>): Promise<void> {
		const completeData: RegisterData = {
			...registerContext.value,
			...value,
		};
		registerContext.setValue((prev) => ({
			...prev,
			...value,
		}));

		console.log(completeData);
		mutation.mutate(completeData);
	}

	if (status === "success") {
		return <Success />;
	}

	if (status === "failed") {
		return <Failed />;
	}

	return (
		<div className="h-full w-full flex flex-col gap-12">
			<section className="space-y-1 content-center flex flex-col justify-center items-center">
				<H1 className="text-center">Complete your profile</H1>
			</section>

			<section className="h-full">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="avatar"
							render={({ field: { value, onChange, ...fieldProps } }) => (
								<FormItem>
									<FormControl>
										<div>
											<LabelMedium className="text-muted text-center mb-3.5">
												Image must be in PNG or JPG, under 5MB
											</LabelMedium>

											<div className="relative content-center w-fit mx-auto">
												<div className="relative">
													<Avatar className="size-50 bg-gradient-to-b from-accent to-muted">
														<AvatarImage src={previewUrl || ""} />
													</Avatar>

													<div className="size-16 flex justify-center items-center absolute right-0 bottom-0 rounded-full bg-card z-10">
														<IconUserPen className="size-10 text-primary" />
													</div>
												</div>

												<button
													type="button"
													onClick={() => fileInputRef.current?.click()}
													className="absolute inset-0 opacity-0 cursor-pointer z-50"
												></button>

												<input
													{...fieldProps}
													ref={fileInputRef}
													type="file"
													accept="image/jpeg,image/jpg,image/png"
													className="hidden"
													onChange={(e) => {
														const file = e.target.files?.[0];
														if (file) {
															form.setValue("avatar", file);
															const reader = new FileReader();
															reader.onloadend = () => {
																setPreviewUrl(reader.result as string);
															};
															reader.readAsDataURL(file);
															onChange(file);
														}
													}}
												/>
											</div>
										</div>
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

						<Button
							type="submit"
							className="w-full"
							disabled={!form.formState.isValid || mutation.isPending}
						>
							Create
						</Button>
					</form>
				</Form>
			</section>
		</div>
	);
}

function Success(): JSX.Element {
	return (
		<div className="h-full w-full flex flex-col gap-30">
			<section className="space-y-3.5 content-center flex flex-col justify-center items-center">
				<img
					src={doneIllustration}
					alt="Done illustration"
					className="w-full max-w-xs mx-auto"
				/>

				<H1 className="text-center">
					You have successfully created an account.
				</H1>
			</section>

			<Button asChild>
				<Link to="/login">Log In</Link>
			</Button>
		</div>
	);
}

function Failed(): JSX.Element {
	return (
		<div className="h-full w-full flex flex-col gap-30">
			<section className="space-y-7.5 content-center flex flex-col justify-center items-center">
				<img
					src={accessDeniedIllustration}
					alt="Failed illustration"
					className="w-full max-w-xs mx-auto"
				/>

				<div className="space-y-1.5">
					<H1 className="text-center">Failed to create account.</H1>
					<TitleSmall className="text-center">
						A temporary issue occured. Please check your network and Try Again
						in a moment.
					</TitleSmall>
				</div>
			</section>

			<section className="w-full flex flex-col text-center gap-4">
				<Button>Try Again</Button>

				<Link to="/">
					<LabelLarge>or return to Welcome Page</LabelLarge>
				</Link>
			</section>
		</div>
	);
}
