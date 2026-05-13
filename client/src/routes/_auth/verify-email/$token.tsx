import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type JSX } from "react";
import { BACKEND_URL, protectedFetch, type ApiResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_auth/verify-email/$token")({
	component: VerifyEmail,
});

function VerifyEmail(): JSX.Element {
	const { token } = Route.useParams();
	const [status, setStatus] = useState<"loading" | "success" | "error">(
		"loading",
	);
	const [message, setMessage] = useState("");

	useEffect(() => {
		async function verify() {
			try {
				const response = await protectedFetch(`${BACKEND_URL}/verify-email`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ token }),
				});

				const result: ApiResponse = await response.json();
				if (response.ok) {
					setStatus("success");
					setMessage(result.message);
				} else {
					setStatus("error");
					setMessage(result.message || "Verification failed");
				}
			} catch (error) {
				setStatus("error");
				setMessage("An error occurred during verification.");
			}
		}

		verify();
	}, [token]);

	return (
		<div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
			{status === "loading" && (
				<>
					<Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
					<h1 className="text-2xl font-bold mb-2">Verifying your email...</h1>
					<p className="text-muted-foreground">
						Please wait while we verify your account.
					</p>
				</>
			)}

			{status === "success" && (
				<>
					<CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
					<h1 className="text-2xl font-bold mb-2">Email Verified!</h1>
					<p className="text-muted-foreground mb-6">{message}</p>
					<Button asChild>
						<Link to="/login">Go to Login</Link>
					</Button>
				</>
			)}

			{status === "error" && (
				<>
					<XCircle className="h-12 w-12 text-destructive mb-4" />
					<h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
					<p className="text-muted-foreground mb-6">{message}</p>
					<Button asChild variant="outline">
						<Link to="/check-email">Resend verification email</Link>
					</Button>
				</>
			)}
		</div>
	);
}
