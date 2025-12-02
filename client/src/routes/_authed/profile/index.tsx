import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { z } from "zod";
import {
	BACKEND_URL,
	IMAGE_FORMATS,
	IMAGE_SIZE_LIMIT,
	toImageUrl,
	type ApiResponse,
} from "@/lib/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRef, useState } from "react";
import { IconUserPen } from "@/lib/icons";
import { H2 } from "@/components/typography";
import { Success } from "@/components/success";
import { Failed } from "@/components/failed";
import type { User } from "@/lib/user";

export const Route = createFileRoute("/_authed/profile/")({
	component: RouteComponent,
});

const formSchema = z.object({
	userId: z.uuidv4(),
	email: z.email().optional(),
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
			"Invalid file: Must be PNG or JPG, under 5MB.",
		)
		.refine(
			(file) => IMAGE_FORMATS.includes(file.type),
			"Invalid file: Must be PNG or JPG, under 5MB.",
		)
		.optional(),
});

async function editProfile(
	value: z.infer<typeof formSchema>,
): Promise<ApiResponse<User>> {
	const formData = new FormData();
	formData.append("id", value.userId);
	if (value.email) formData.append("email", value.email);
	if (value.firstName) formData.append("firstName", value.firstName);
	if (value.middleName) formData.append("middleName", value.middleName);
	if (value.lastName) formData.append("lastName", value.lastName);
	if (value.avatar) formData.append("avatar", value.avatar);

	const response = await fetch(`${BACKEND_URL}/users/${value.userId}`, {
		method: "PATCH",
		body: formData,
	});

	const result: ApiResponse<User> = await response.json();
	if (!response.ok) {
		throw new Error(result.message || "Failed to update profile");
	}

	return result;
}

function RouteComponent() {
	const auth = useAuth();
	const navigate = Route.useNavigate();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(
		toImageUrl(auth.user?.avatarUrl) || null,
	);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: auth.user?.email,
			firstName: auth.user?.firstName,
			middleName: auth.user?.middleName || "",
			lastName: auth.user?.lastName,
			userId: auth.user?.id || "",
		},
		mode: "onTouched",
	});

	const mutation = useMutation({
		mutationFn: editProfile,
		onSuccess: (res) => {
			auth.setUser(res.data);
		},
	});

	async function onSubmit(value: z.infer<typeof formSchema>): Promise<void> {
		if (!auth.user?.id) {
			toast.error("User not found");
			return;
		}

		value.userId = auth.user.id;
		mutation.mutate(value);
	}

	async function handleLogout(): Promise<void> {
		await auth.logout();
		await navigate({ to: "/onboarding" });
	}

	if (mutation.isError) {
		return (
			<Failed
				backLink="/profile"
				header="Profile update failed."
				fn={form.handleSubmit(onSubmit)}
				backMessage="or return to Request List"
				retry={form.handleSubmit(onSubmit)}
			/>
		);
	}

	if (mutation.isSuccess) {
		return (
			<Success
				backLink="/profile"
				header="Profile updated successfully."
				fn={() => {
					mutation.reset();
				}}
			/>
		);
	}

	return (
		<div className="flex flex-col justify-between gap-4">
			<div className="space-y-6">
				<H2 className="text-center">Profile</H2>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
									) : value ? null : null}

									<H2 className="text-center">
										{auth.user?.firstName} {auth.user?.lastName}
									</H2>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input
											placeholder="youremail@gmail.com"
											disabled
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

						<div className="space-y-2.5">
							<Button
								type="submit"
								className="w-full"
								disabled={mutation.isPending}
							>
								Update Profile
							</Button>

							<Button
								type="button"
								onClick={handleLogout}
								className="w-full"
								variant="secondary"
								disabled={mutation.isPending}
							>
								Log Out
							</Button>
						</div>
					</form>
				</Form>
			</div>
		</div>
	);
}
