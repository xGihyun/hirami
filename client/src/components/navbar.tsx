import { Link, linkOptions } from "@tanstack/react-router";
import type { JSX } from "react";
import { LabelSmall } from "./typography";
import { useAuth } from "@/auth";
import { cn } from "@/lib/utils";
import { getNavOptions } from "@/lib/constant";

type Props = {
	className?: string;
};

export function Navbar(props: Props): JSX.Element {
	const auth = useAuth();

	const navOptions = linkOptions(getNavOptions(auth.user?.role.code, true));

	return (
		<header
			className={cn(
				"gap-2 bg-card text-primary fixed bottom-0 left-0 w-full shadow z-40 pb-[env(safe-area-inset-bottom)] rounded-t-2xl pt-2",
				props.className,
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
