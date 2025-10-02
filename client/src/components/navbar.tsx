import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "./ui/button";
import type { JSX } from "react";
import { useAuth } from "@/auth";

export function Navbar(): JSX.Element {
    const auth = useAuth()
	const navigate = useNavigate();

	async function handleSignOut(): Promise<void> {
		await auth.signOut();
		await navigate({ to: "/login" });
	}

	return (
		<header className="p-2 flex gap-2 bg-white text-black justify-between">
			<nav className="flex flex-row">
				<div className="px-2 font-bold">
					<Link to="/equipments">Equipments</Link>

					<Button onClick={handleSignOut}>Logout</Button>
				</div>
			</nav>
		</header>
	);
}
