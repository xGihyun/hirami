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
import { IconEdit } from "@/lib/icons";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authed/profile/")({
	component: RouteComponent,
});

const formSchema = z.object({
	userId: z.uuidv4(),
	email: z.email().optional(),
	firstName: z.string().optional(),
	middleName: z.string().optional(),
	lastName: z.string().optional(),
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

async function editProfile(
	value: z.infer<typeof formSchema>,
): Promise<ApiResponse> {
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

	const result: ApiResponse = await response.json();
	if (!response.ok) {
		throw new Error(result.message || "Failed to update profile");
	}

	return result;
}

function RouteComponent() {
	const auth = useAuth();
	const navigate = Route.useNavigate();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: auth.user?.email,
			firstName: auth.user?.firstName,
			middleName: auth.user?.middleName || "",
			lastName: auth.user?.lastName,
			userId: auth.user?.id || "",
		},
	});

	const mutation = useMutation({
		mutationFn: editProfile,
		onMutate: () => {
			return toast.loading("Updating profile");
		},
		onSuccess: (data, _variables, toastId) => {
			toast.success(data.message, { id: toastId });
		},
		onError: (error, _variables, toastId) => {
			toast.error(error.message, { id: toastId });
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
		await navigate({ to: "/login" });
	}

	const avatarUrl = auth.user?.avatarUrl
		? `${BACKEND_URL}/${auth.user.avatarUrl}`
		: undefined;

	return (
		<div className="flex flex-col justify-between gap-4">
			<div className="space-y-4">
				<section className="flex flex-col items-center justify-center">
					<div className="relative group">
						<div className="relative">
							<Avatar className="size-20">
								<AvatarImage src={previewUrl || avatarUrl} />
								<AvatarFallback className="text-3xl font-montserrat-semibold">
									{auth.user?.firstName[0]}
									{auth.user?.lastName[0]}
								</AvatarFallback>
							</Avatar>

							<div className="size-6 flex justify-center items-center absolute right-0 bottom-0 rounded-full bg-foreground z-10">
								<IconEdit className="size-3 text-background" />
							</div>
						</div>

						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer z-50"
						>
							<IconEdit className="size-6 text-white" />
						</button>

						<input
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
								}
							}}
						/>
					</div>

					<p className="font-montserrat-semibold">
						{auth.user?.firstName} {auth.user?.lastName}
					</p>
				</section>

				<Separator />

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

						<Button
							type="submit"
							className="w-full"
							variant="secondary"
							disabled={mutation.isPending}
						>
							Update Profile
						</Button>
					</form>
				</Form>
			</div>

            <Separator />

			<Button
				onClick={handleLogout}
				className="w-full"
				disabled={mutation.isPending}
			>
				Log Out
			</Button>
		</div>
	);
}
