import { Link } from "@tanstack/react-router";
import { Button } from "./ui/button";
import type { JSX } from "react";

export function Navbar(): JSX.Element {
	return (
		<header className="p-2 flex gap-2 bg-white text-black justify-between">
			<nav className="flex flex-row">
				<div className="px-2 font-bold">
					<Link to="/equipments">Equipments</Link>

					<Button>Logout</Button>
				</div>
			</nav>
		</header>
	);
}
