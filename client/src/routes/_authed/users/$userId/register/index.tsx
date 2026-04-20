import { H1, LabelMedium, TitleSmall } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconEdit, IconUserPen } from "@/lib/icons";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type JSX } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDownIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { FullScreenLoading } from "@/components/loading";
import { Failed } from "@/components/failed";
import { Success } from "@/components/success";
import { registerUserSchema, type RegisterUser } from "@/lib/user/model";
import { registerUser } from "@/lib/user/auth";

export const Route = createFileRoute("/_authed/users/$userId/register/")({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const form = useForm<RegisterUser>({
		resolver: zodResolver(registerUserSchema),
		defaultValues: {
			firstName: "",
			middleName: "",
			lastName: "",
			password: "",
			confirmPassword: "",
			email: "",
		},
		mode: "onTouched",
	});

	const mutation = useMutation({
		mutationFn: registerUser,
	});

	async function onSubmit(value: RegisterUser): Promise<void> {
		mutation.mutate(value);
	}

	const imageFile = form.watch("avatar");
	const previewUrl = useMemo(() => {
		if (!imageFile) return null;
		const url = URL.createObjectURL(imageFile);
		return url;
	}, [imageFile]);

	useEffect(() => {
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
		};
	}, [previewUrl]);

	return (
		<div>
			<Button
				variant="ghost"
				size="icon"
				className="size-15 hidden md:flex"
				asChild
			>
				<Link to="/users">
					<IconArrowLeft className="size-8" />
				</Link>
			</Button>

			<header className="text-center mb-15">
				<H1>Register User</H1>
				<TitleSmall>
					Enter the details required to add a new user to the system.
				</TitleSmall>
			</header>

			<section className="bg-background p-6 rounded-xl">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7.5">
						<div className="flex gap-7.5">
							<section className="space-y-4">
								<FormField
									control={form.control}
									name="avatar"
									render={({
										field: { value, onChange, ...fieldProps },
										fieldState,
									}) => (
										<FormItem>
											<FormControl>
												<div className="relative group mb-2.5 w-fit mx-auto">
													<div className="relative">
														<Avatar className="size-[16.5rem]">
															<AvatarImage
																src={previewUrl || undefined}
																className="object-cover"
															/>
															<AvatarFallback className="bg-gradient-to-b from-accent to-[#80786D]" />
														</Avatar>

														<div className="size-21 flex justify-center items-center absolute right-0 bottom-0 rounded-full bg-card z-10">
															<IconUserPen className="size-12 text-primary" />
														</div>
													</div>

													<button
														type="button"
														onClick={() => fileInputRef.current?.click()}
														className="absolute inset-0 opacity-0 flex items-center justify-center cursor-pointer z-50"
													>
														<IconEdit className="size-6 text-white" />
													</button>

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
																onChange(file);
															}
														}}
													/>
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
							</section>

							<section className="space-y-4 w-full">
								<FormField
									control={form.control}
									name="firstName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>First Name</FormLabel>
											<FormControl>
												<Input placeholder="Enter your First Name" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<div className="grid grid-cols-2 gap-2.5">
									<FormField
										control={form.control}
										name="middleName"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Middle Name</FormLabel>
												<FormControl>
													<Input
														placeholder="Enter your Middle Name"
														{...field}
													/>
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
													<Input
														placeholder="Enter your Last Name"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<div className="grid grid-cols-2 gap-2.5">
									<FormField
										control={form.control}
										name="email"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Email</FormLabel>
												<FormControl>
													<Input placeholder="Enter your email" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

								</div>

								<Button
									type="submit"
									className="w-full shadow-none"
									disabled={!form.formState.isValid || mutation.isPending}
								>
									Confirm
								</Button>
							</section>
						</div>
					</form>
				</Form>
			</section>
		</div>
	);
}
