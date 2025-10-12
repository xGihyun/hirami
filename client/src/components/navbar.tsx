import { Link, linkOptions } from "@tanstack/react-router";
import type { JSX } from "react";
import {
	IconHistory,
	IconHome,
	IconProfile,
	IconRoundArrowUp,
} from "@/lib/icons";
import { LabelSmall } from "./typography";

export function Navbar(): JSX.Element {
	const options = linkOptions([
		{
			to: "/equipments",
			label: "Home",
			icon: IconHome,
		},
		{
			to: "/return",
			label: "Return",
			icon: IconRoundArrowUp,
		},
		{
			to: "/borrow-requests",
			label: "History",
			icon: IconHistory,
		},
		{
			to: "/profile",
			label: "Profile",
			icon: IconProfile,
		},
		{
			to: "/borrow-requests",
			label: "Borrow Requests",
			icon: IconProfile,
		},
		{
			to: "/return-requests",
			label: "Return Requests",
			icon: IconProfile,
		},
	]);

	return (
		<header className="flex gap-2 bg-card text-primary fixed bottom-0 left-0 w-full shadow z-50 pb-[env(safe-area-inset-bottom)]">
			<nav className="py-1 px-2 font-bold flex justify-around w-full h-16">
				{options.map((opt) => {
					const Icon = opt.icon;
					return (
						<Link
							key={opt.label}
							to={opt.to}
							className="p-2 aspect-square"
							activeProps={{
								className: "bg-primary text-card rounded-full",
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
