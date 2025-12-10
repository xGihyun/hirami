import {
	H1,
	LabelMedium,
} from "@/components/typography";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type JSX } from "react";
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
import { IconUserPen } from "@/lib/icons";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Success } from "@/components/success";
import { Failed } from "@/components/failed";
import { FullScreenLoading } from "@/components/loading";

export const Route = createFileRoute("/_auth/_register/register/personal/")({
	component: RouteComponent,
});

const formSchema = z.object({
	firstName: z
		.string()
		.nonempty(),
	middleName: z.string().optional(),
	lastName: z
		.string()
		.nonempty(),
	avatar: z
		.instanceof(File)
		.refine(
			(file) => file.size <= IMAGE_SIZE_LIMIT,
			"Invalid file: Must be PNG or JPG, under 5MB",
		)
		.refine(
			(file) => IMAGE_FORMATS.includes(file.type),
			"Invalid file: Must be PNG or JPG, under 5MB",
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
	const registerContext = useRegister();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			firstName: registerContext.value.firstName,
			middleName: registerContext.value.middleName,
			lastName: registerContext.value.lastName,
			avatar: registerContext.value.avatar,
		},
		mode: "all",
	});

	const mutation = useMutation({
		mutationFn: register,
	});

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	async function onSubmit(value: z.infer<typeof formSchema>): Promise<void> {
		const completeData: RegisterData = {
			...registerContext.value,
			...value,
		};
		registerContext.setValue(completeData);

		console.log(completeData);
		mutation.mutate(completeData);
	}

	useEffect(() => {
		const avatarFile = registerContext.value.avatar;
		if (avatarFile) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setPreviewUrl(reader.result as string);
			};
			reader.readAsDataURL(avatarFile);
		}

		const hasExistingValues =
			registerContext.value.firstName ||
			registerContext.value.middleName ||
			registerContext.value.lastName ||
			registerContext.value.avatar;

		if (hasExistingValues) {
			form.trigger();
		}

		return () => {
			const currentValues = form.getValues();
			registerContext.setValue((prev) => ({
				...prev,
				...currentValues,
			}));
		};
	}, []);

	if (mutation.isPending) {
		return <FullScreenLoading />;
	}

	if (mutation.isSuccess) {
		return (
			<Success
				header="You have successfully created an account."
				backLink="/login"
			/>
		);
	}

	if (mutation.isError) {
		return (
			<Failed
				header="Failed to create account."
				backLink="/onboarding"
				backMessage="or return to Welcome Page"
				retry={form.handleSubmit(onSubmit)}
			/>
		);
	}

	return (
		<div className="h-full w-full flex flex-col gap-12">
			<section className="space-y-1 content-center flex flex-col justify-center items-center">
				<H1 className="text-center">Complete your profile</H1>
			</section>

			<section className="h-full">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
						<FormField
							control={form.control}
							name="avatar"
							render={({
								field: { value, onChange, ...fieldProps },
								fieldState,
							}) => (
								<FormItem>
									<FormControl>
										<div>
											<div className="relative content-center w-fit mx-auto">
												<div className="relative">
													<Avatar className="size-50 bg-gradient-to-b from-accent to-muted">
														<AvatarImage
															src={previewUrl || ""}
															className="object-cover"
														/>
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
															form.setValue("avatar", file, {
																shouldValidate: true,
															});
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

									{fieldState.error ? (
										<FormMessage className="text-center mt-1" />
									) : value ? (
										<LabelMedium className="text-muted text-center mt-1">
											{value.name}
										</LabelMedium>
									) : (
										<LabelMedium className="text-muted text-center mt-1">
											Image must be in PNG or JPG, under 5MB
										</LabelMedium>
									)}
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
							disabled={!form.formState.isValid}
						>
							Create
						</Button>
					</form>
				</Form>
			</section>
		</div>
	);
}
