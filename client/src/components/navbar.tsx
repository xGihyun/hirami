import { Link, linkOptions, useLocation } from "@tanstack/react-router";
import type { JSX } from "react";
import {
	IconBox,
	IconHistory,
	IconProfile,
	IconQrCode,
	IconRoundArrowDown,
	IconRoundArrowUp,
    IconUserRoundCog,
} from "@/lib/icons";
import { LabelSmall } from "./typography";
import { useAuth } from "@/auth";
import { UserRole } from "@/lib/user";
import { cn } from "@/lib/utils";

export function Navbar(): JSX.Element {
	const auth = useAuth();
	const location = useLocation();

	const getNavOptions = () => {
		const commonOptions = [
			{
				to: "/equipments",
				label: "Catalog",
				icon: IconBox,
			},
		];

		const profileOption = {
			to: "/profile",
			label: "Profile",
			icon: IconProfile,
		};

		const historyOption = {
			to: "/history",
			label: "History",
			icon: IconHistory,
		};

		if (auth.user?.role === UserRole.Borrower) {
			return [
				...commonOptions,
				{
					to: "/return",
					label: "Return",
					icon: IconRoundArrowUp,
				},
                {
					to: "/borrow-scan",
					label: "Scan",
					icon: IconQrCode,
                },
				historyOption,
				profileOption,
			];
		}

		return [
			...commonOptions,
			{
				to: "/borrow-requests",
				label: "Requests",
				icon: IconRoundArrowUp,
			},
			historyOption,
			{
				to: "/return-requests",
				label: "DELETE LATER",
				icon: IconRoundArrowUp,
			},
			{
				to: "/users",
				label: "Users",
				icon: IconUserRoundCog,
			},
			profileOption,
		];
	};

	const navOptions = linkOptions(getNavOptions());

	return (
		<header
			className={cn(
				"gap-2 bg-card text-primary fixed bottom-0 left-0 w-full shadow z-40 pb-[env(safe-area-inset-bottom)] rounded-t-2xl pt-2",
				location.search.success !== undefined ? "hidden" : "flex",
			)}
		>
			<nav className="py-1 px-2 font-bold flex justify-around w-full h-16">
				{navOptions.map((opt) => {
					const Icon = opt.icon;
					return (
						<Link
							key={opt.label}
							to={opt.to}
							className="p-2 aspect-square rounded-lg"
							activeProps={{
								className: "bg-primary text-card",
							}}
						>
							<div className="flex flex-col items-center justify-center h-full">
								<Icon className="size-5 mx-auto" />
								<LabelSmall>{opt.label}</LabelSmall>
							</div>
						</Link>
					);
				})}
			</nav>
		</header>
	);
}
