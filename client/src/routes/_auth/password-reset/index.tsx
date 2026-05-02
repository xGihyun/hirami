import { BACKEND_URL, type ApiResponse } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
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
import {
	accessDeniedIllustration,
	messageSentIllustration,
	passwordResetIllustration,
	unlockIllustration,
} from "@/lib/assets";
import { H1, TitleSmall } from "@/components/typography";
import { PaddingLayout } from "@/routes/-components/padding-layout";
import { Success } from "@/components/success";
import { Failed } from "@/components/failed";
import { FullScreenLoading } from "@/components/loading";

export const Route = createFileRoute("/_auth/password-reset/")({
	component: RouteComponent,
});

const formSchema = z.object({
	email: z.string().nonempty().email({ error: "Invalid email format." }),
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
	});

	async function onSubmit(value: z.infer<typeof formSchema>): Promise<void> {
		mutation.mutate(value);
	}

	if (mutation.isPending) {
		return <FullScreenLoading />;
	}

	if (mutation.isSuccess) {
		return (
			<Success
				backLink="/onboarding"
				header="A password reset link has been sent to your email."
				illustration={messageSentIllustration}
				fn={mutation.reset}
				className="md:bg-background md:p-5"
			/>
		);
	}

	if (mutation.isError) {
		return (
			<Failed
				header="Password reset failed."
				fn={mutation.reset}
				retry={form.handleSubmit(onSubmit)}
				backLink="/onboarding"
				backMessage="or return to Welcome Page"
				illustration={accessDeniedIllustration}
				className="md:bg-background md:p-5"
			/>
		);
	}

	return (
		<div className="flex h-full w-full">
			<section className="w-full h-full hidden md:block">
				<PaddingLayout className="flex items-center justify-center">
					<div className="relative h-full w-full flex">
						<Button
							variant="ghost"
							size="icon"
							className="size-15 absolute inset-0"
							asChild
						>
							<Link to="/onboarding">
								<IconArrowLeft className="size-8" />
							</Link>
						</Button>

						<img
							src={unlockIllustration}
							alt="Password reset illustration"
							className="w-full max-w-md ml-auto aspect-[208/167]"
						/>
					</div>
				</PaddingLayout>
			</section>

			<section className="w-full h-full">
				<PaddingLayout className="md:flex md:items-start md:justify-center">
					<div className="h-full w-full md:bg-white md:rounded-[1.25rem] md:p-12 md:h-fit md:max-w-md">
						<Button
							variant="ghost"
							size="icon"
							className="size-15 block md:hidden"
							asChild
						>
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
									<form
										onSubmit={form.handleSubmit(onSubmit)}
										className="space-y-15"
									>
										<FormField
											control={form.control}
											name="email"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Email</FormLabel>
													<FormControl>
														<Input
															placeholder="youremail@gmail.com"
															{...field}
														/>
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
											Verify
										</Button>
									</form>
								</Form>
							</div>
						</main>
					</div>
				</PaddingLayout>
			</section>
		</div>
	);
}
