import { H1, LabelLarge, TitleSmall } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { connectionLostIllustration, homeRunIllustration } from "@/lib/assets";
import { IconArrowLeft } from "@/lib/icons";
import { useMutation, useMutationState } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import type { JSX } from "react";
import { borrow, type BorrowRequestSchema } from "../-function";
import { toast } from "sonner";

export function BorrowFailed(): JSX.Element {
	const mutationState = useMutationState({
		filters: { mutationKey: ["submit-borrow-request"] },
		select: (mutation) => mutation,
	});
	const mutation = mutationState[0];
	const variables = mutation?.state.variables as BorrowRequestSchema;
	const navigate = useNavigate({ from: "/equipments" });

	const retryMutation = useMutation({
		mutationKey: ["submit-borrow-request"],
		mutationFn: borrow,
		onMutate: (variables) => {
            console.log(variables)
			return toast.loading("Submitting borrow request");
		},
		onSuccess: async (data, _variables, toastId) => {
			toast.success(data.message, { id: toastId });
			await navigate({ to: "/equipments", search: { success: true } });
		},
	});

	// Redirect if no variables (direct access to error page)
	if (!variables) {
		navigate({ to: "/equipments" });
	}

	return (
		<div className="h-full w-full">
			<Button variant="ghost" size="icon" className="size-15">
				<Link to="/equipments">
					<IconArrowLeft className="size-8" />
				</Link>
			</Button>

			<main className="mt-10 pb-10">
				<div className="h-full w-full flex flex-col gap-30">
					<section className="space-y-3.5 content-center flex flex-col justify-center items-center">
						<img
							src={connectionLostIllustration}
							alt="Connection lost illustration"
							className="w-full max-w-xs mx-auto"
						/>

						<div className="space-y-1.5">
							<H1 className="text-center">
								Borrow request failed. <br />
								Please try again
							</H1>

							<TitleSmall className="text-center">
								A temporary issue occured. Please check your network and Try
								Again in a moment.
							</TitleSmall>
						</div>
					</section>

					<section className="w-full flex flex-col text-center gap-4">
						<Button onClick={() => retryMutation.mutate(variables)}>
							Try Again
						</Button>

						<Link to="/equipments">
							<LabelLarge>or return to Catalog</LabelLarge>
						</Link>
					</section>
				</div>
			</main>
		</div>
	);
}
