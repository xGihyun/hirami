import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type JSX } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MailCheck, Loader2 } from "lucide-react";
import { BACKEND_URL, type ApiResponse } from "@/lib/api";

export const Route = createFileRoute("/_auth/check-email")({
	validateSearch: (search) => ({
		email: typeof search.email === "string" ? search.email : "",
	}),
	component: CheckEmail,
});

async function resendVerification(email: string): Promise<ApiResponse> {
	const response = await fetch(`${BACKEND_URL}/resend-verification`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email }),
	});
	return response.json();
}

function CheckEmail(): JSX.Element {
	const { email: initialEmail } = Route.useSearch();
	const [email, setEmail] = useState(initialEmail);

	const mutation = useMutation({
		mutationFn: resendVerification,
		onSuccess: () => {
			toast.success("Verification email sent! Please check your inbox.");
		},
		onError: () => {
			toast.error("Failed to resend verification email. Please try again.");
		},
	});

	return (
		<div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center gap-4">
			<MailCheck className="h-12 w-12 text-primary" />
			<h1 className="text-2xl font-bold">Check your email</h1>
			{initialEmail ? (
				<p className="text-muted-foreground max-w-sm">
					We sent a verification link to{" "}
					<strong>{initialEmail}</strong>. Click the link to activate
					your account.
				</p>
			) : (
				<p className="text-muted-foreground max-w-sm">
					We sent a verification link to your email address. Click the
					link to activate your account.
				</p>
			)}

			<div className="flex flex-col items-center gap-2 w-full max-w-xs pt-2">
				<p className="text-sm text-muted-foreground">
					Didn't receive it?
				</p>
				<Input
					type="email"
					placeholder="Enter your email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
				<Button
					variant="outline"
					className="w-full"
					disabled={!email || mutation.isPending}
					onClick={() => mutation.mutate(email)}
				>
					{mutation.isPending ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Sending...
						</>
					) : (
						"Resend verification email"
					)}
				</Button>
			</div>

			<Button asChild variant="ghost">
				<Link to="/login">Back to Login</Link>
			</Button>
		</div>
	);
}
