import { H1, H2, LabelMedium } from "@/components/typography";
import { usersQuery, editUser, type User } from "@/lib/user";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import z from "zod";
import { Search } from "./-components/search";
import { useState, type JSX } from "react";
import { ComponentLoading } from "@/components/loading";
import { UserList } from "./-components/user-list";
import { Button } from "@/components/ui/button";
import { v4 as uuidv4 } from "uuid";
import { Success } from "@/components/success";
import { toast } from "sonner";

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
	const queryClient = useQueryClient();
	const [actionType, setActionType] = useState<
		"deactivate" | "reactivate" | null
	>(null);

	const mutation = useMutation({
		mutationFn: editUser,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["users"] });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	function handleAction(user: User): void {
		setActionType(user.isActive ? "deactivate" : "reactivate");
		mutation.mutate({
			userId: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
			middleName: user.middleName,
			role: user.role.code,
			isActive: !user.isActive,
		});
	}

	if (mutation.isSuccess) {
		return (
			<Success
				header={`Account ${actionType === "deactivate" ? "deactivated" : "reactivated"} successfully.`}
				backLink="/users"
				fn={() => {
					mutation.reset();
					setActionType(null);
				}}
			/>
		);
	}

	if (mutation.isError) {
		return (
			<Success
				header={`Failed to ${actionType === "deactivate" ? "deactivate" : "reactivate"} account.`}
				backLink="/users"
				fn={() => {
					mutation.reset();
					setActionType(null);
				}}
			/>
		);
	}

	return (
		<main className="space-y-4 min-w-0 overflow-x-hidden">
			<header className="flex flex-col w-full justify-between gap-4">
				<H2 className="text-center md:hidden block">Users</H2>
				<H1 className="text-start md:block hidden">Users</H1>
				<Search />
			</header>

			<Users onAction={handleAction} isPending={mutation.isPending} />

			<Button className="fixed bottom-10 right-8 w-92 z-50 shadow" asChild>
				<Link to="/users/$userId/register" params={{ userId: uuidv4() }}>
					Create new account
				</Link>
			</Button>
		</main>
	);
}

type UsersProps = {
	onAction: (user: User) => void;
	isPending: boolean;
};

function Users({ onAction, isPending }: UsersProps): JSX.Element {
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

	return (
		<UserList users={users.data} onAction={onAction} isPending={isPending} />
	);
}
