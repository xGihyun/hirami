import { createFileRoute, redirect } from "@tanstack/react-router";
import logo from "../logo.svg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
	beforeLoad: () => {
		throw redirect({ to: "/equipments" });
	},
});
