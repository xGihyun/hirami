import { Navbar } from "@/components/navbar";
import { BACKEND_URL } from "@/lib/api";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, type JSX } from "react";
import { EventSource } from "eventsource";
import {
	BorrowRequestStatus,
	type ReviewBorrowResponse,
} from "@/lib/equipment/borrow";
import { toast } from "sonner";
import { useAuth } from "@/auth";
import { UserRole } from "@/lib/user";

export const Route = createFileRoute("/_authed")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		const session = await context.auth.validateSession();
		if (session === null) {
			throw redirect({ to: "/onboarding" });
		}
	},
});

function RouteComponent(): JSX.Element {
	const auth = useAuth();

	useEffect(() => {
		if (auth.user?.role.code === UserRole.EquipmentManager) {
			return;
		}

		const eventSource = new EventSource(`${BACKEND_URL}/events`);

		function handleEvent(e: MessageEvent<string>): void {
			const res = JSON.parse(e.data) as ReviewBorrowResponse;
			if (res.status.code === BorrowRequestStatus.Approved) {
				toast.success("Your borrow request has been approved.", {
					duration: Number.POSITIVE_INFINITY,
				});
				return;
			}

			toast.success("Your borrow request has been rejected.", {
				duration: Number.POSITIVE_INFINITY,
			});
		}

		const listenerType = "borrow-request:review";
		eventSource.addEventListener(listenerType, handleEvent);

		return () => {
			eventSource.removeEventListener(listenerType, handleEvent);
			eventSource.close();
		};
	}, []);

	return (
		<div className="pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] px-4 lg:px-10">
			<Outlet />
			<Navbar />
		</div>
	);
}
