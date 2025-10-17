import { Link, linkOptions } from "@tanstack/react-router";
import type { JSX } from "react";
import {
	IconHistory,
	IconHome,
	IconProfile,
	IconRoundArrowDown,
	IconRoundArrowUp,
} from "@/lib/icons";
import { LabelSmall } from "./typography";
import { useAuth } from "@/auth";
import { UserRole } from "@/lib/user";

export function Navbar(): JSX.Element {
	const auth = useAuth();

	const getNavOptions = () => {
		const commonOptions = [
			{
				to: "/equipments",
				label: "Home",
				icon: IconHome,
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
				historyOption,
				profileOption,
			];
		}

		return [
			...commonOptions,
			{
				to: "/borrow-requests",
				label: "Borrows",
				icon: IconRoundArrowDown,
			},
			{
				to: "/return-requests",
				label: "Returns",
				icon: IconRoundArrowUp,
			},
			historyOption,
			profileOption,
		];
	};

	const navOptions = linkOptions(getNavOptions());

	return (
		<header className="flex gap-2 bg-card text-primary fixed bottom-0 left-0 w-full shadow z-50 pb-[env(safe-area-inset-bottom)]">
			<nav className="py-1 px-2 font-bold flex justify-around w-full h-16">
				{navOptions.map((opt) => {
					const Icon = opt.icon;
					return (
						<Link
							key={opt.label}
							to={opt.to}
							className="p-2 aspect-square"
							activeProps={{
								className: "bg-primary text-card rounded-lg",
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
