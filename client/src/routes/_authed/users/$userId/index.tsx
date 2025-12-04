import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { toImageUrl } from "@/lib/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRef, useState, type JSX } from "react";
import { IconArrowLeft, IconUserPen } from "@/lib/icons";
import { H2 } from "@/components/typography";
import { Success } from "@/components/success";
import { Failed } from "@/components/failed";
import {
	editUser,
	editUserSchema,
	userByIdQuery,
	UserRole,
	type EditUserSchema,
} from "@/lib/user";
import {
	NativeSelect,
	NativeSelectOption,
} from "@/components/ui/native-select";

export const Route = createFileRoute("/_authed/users/$userId/")({
	component: RouteComponent,
	loader: ({ context, params }) => {
		context.queryClient.ensureQueryData(userByIdQuery(params.userId));
	},
});

function RouteComponent(): JSX.Element {
	const params = Route.useParams();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const userResult = useQuery(userByIdQuery(params.userId));
	const user = userResult.data;
	const queryClient = useQueryClient();

	const [previewUrl, setPreviewUrl] = useState<string | null>(
		toImageUrl(user?.avatarUrl) || null,
	);

	const form = useForm<EditUserSchema>({
		resolver: zodResolver(editUserSchema),
		defaultValues: {
			email: user?.email,
			firstName: user?.firstName,
			middleName: user?.middleName || "",
			lastName: user?.lastName,
			userId: user?.id || "",
			role: user?.role.code,
		},
		mode: "onTouched",
	});

	const mutation = useMutation({
		mutationFn: editUser,
		onSuccess: () => {
			queryClient.invalidateQueries(userByIdQuery(params.userId));
		},
	});

	async function onSubmit(value: EditUserSchema): Promise<void> {
		if (!user?.id) {
			toast.error("User not found");
			return;
		}

		value.userId = user.id;
		mutation.mutate(value);
	}

	if (mutation.isError) {
		return (
			<Failed
				backLink={`/users/${params.userId}`}
				header="User update failed."
				fn={form.handleSubmit(onSubmit)}
				backMessage="or return to Profile"
				retry={form.handleSubmit(onSubmit)}
			/>
		);
	}

	if (mutation.isSuccess) {
		return (
			<Success
				backLink={`/users`}
				header="User updated successfully."
				fn={() => {
					mutation.reset();
				}}
			/>
		);
	}

	return (
		<div className="flex flex-col justify-between gap-4 relative">
			<Button
				variant="ghost"
				size="icon"
				className="size-15 mb-0 absolute inset-0"
			>
				<Link to="/users">
					<IconArrowLeft className="size-8" />
				</Link>
			</Button>

			<div className="space-y-6">
				<H2 className="text-center">Edit Profile</H2>

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
										{user?.firstName} {user?.lastName}
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
										<Input placeholder="hirami@gmail.com" {...field} />
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
										<Input placeholder="Enter first name" {...field} />
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
										<Input placeholder="Enter middle name" {...field} />
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
										<Input placeholder="Enter last name" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="role"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Role</FormLabel>
									<FormControl>
										<NativeSelect
											{...field}
											onChange={(e) =>
												field.onChange(e.currentTarget.value as UserRole)
											}
										>
											<NativeSelectOption value={UserRole.Borrower}>
												Borrower
											</NativeSelectOption>
											<NativeSelectOption value={UserRole.EquipmentManager}>
												Equipment Manager
											</NativeSelectOption>
										</NativeSelect>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button
							type="submit"
							className="w-full"
							disabled={mutation.isPending}
						>
							Update User
						</Button>
					</form>
				</Form>
			</div>
		</div>
	);
}
