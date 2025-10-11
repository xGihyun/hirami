import { createFileRoute, Link } from "@tanstack/react-router";
import { LoginForm } from "./-components/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { JSX } from "react";

export const Route = createFileRoute("/_auth/login/")({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	return <LoginForm />;
}
