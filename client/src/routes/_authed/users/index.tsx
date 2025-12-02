import { H2, LabelMedium } from "@/components/typography";
import { usersQuery } from "@/lib/user";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import { Search } from "./-components/search";
import type { JSX } from "react";
import { ComponentLoading } from "@/components/loading";
import { UserList } from "./-components/user-list";

const searchSchema = z.object({
	search: z.string().optional(),
});

export const Route = createFileRoute("/_authed/users/")({
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(usersQuery());
	},
	validateSearch: searchSchema,
});

function RouteComponent(): JSX.Element {
	return (
		<main className="space-y-4">
			<header className="flex flex-col w-full items-center justify-between gap-4">
				<H2>Users</H2>
				<Search />
			</header>

			<Users />
		</main>
	);
}

function Users(): JSX.Element {
	const search = Route.useSearch();
	const users = useQuery(usersQuery({ search: search.search }));

	if (users.isPending) {
		return <ComponentLoading />;
	}

	if (users.isError) {
		return (
			<LabelMedium className="text-muted text-center mt-10">
				Failed to load users.
			</LabelMedium>
		);
	}

	if (!users.data) {
		return (
			<LabelMedium className="text-muted text-center mt-10">
				No users found.
			</LabelMedium>
		);
	}

	return <UserList users={users.data} />;
}
