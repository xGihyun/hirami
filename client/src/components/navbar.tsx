import { Link, linkOptions, useNavigate } from "@tanstack/react-router";
import { Button } from "./ui/button";
import type { JSX } from "react";
import { useAuth } from "@/auth";
import {
	IconHistory,
	IconHome,
	IconProfile,
	IconRoundArrowUp,
} from "@/lib/icons";
import { LabelSmall } from "./typography";

export function Navbar(): JSX.Element {
	const auth = useAuth();
	const navigate = useNavigate();

	async function handleSignOut(): Promise<void> {
		await auth.signOut();
		await navigate({ to: "/login" });
	}

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
			to: "/history",
			label: "History",
			icon: IconHistory,
		},

		{
			to: "/profile",
			label: "Profile",
			icon: IconProfile,
		},
	]);

	return (
		<header className="py-1 flex gap-2 bg-card text-primary fixed bottom-0 left-0 w-full shadow">
			<nav className="px-2 font-bold flex justify-around w-full">
				{options.map((opt) => {
					const Icon = opt.icon;
					return (
						<Link
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
