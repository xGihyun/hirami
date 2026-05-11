import { useState, type JSX } from "react";
import type { User } from "@/lib/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toImageUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { getUserRoleBadgeVariant } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { IconEllipsis } from "@/lib/icons";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getFullName } from "@/lib/user/helper";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type Props = {
	users: User[];
	onAction: (user: User) => void;
	isPending: boolean;
};

export function UserList(props: Props): JSX.Element {
	const [selectedUser, setSelectedUser] = useState<User | null>(null);

	function handleAction(): void {
		if (!selectedUser) return;
		props.onAction(selectedUser);
		setSelectedUser(null);
	}

	return (
		<>
			<Table>
				<TableHeader>
					<TableRow className="font-montserrat-bold text-xs leading-5">
						<TableHead>Profile Picture</TableHead>
						<TableHead>Name</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Role</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{props.users.map((user) => {
						const avatarUrl = toImageUrl(user.avatarUrl);
						const initials = user.firstName[0] + user.lastName[0];

						return (
							<TableRow
								className="font-open-sans text-sm leading-6"
								key={user.id}
							>
								<TableCell>
									<Avatar className="size-12">
										<AvatarImage src={avatarUrl} />
										<AvatarFallback>{initials}</AvatarFallback>
									</Avatar>
								</TableCell>
								<TableCell>{getFullName(user)}</TableCell>
								<TableCell>{user.email}</TableCell>
								<TableCell>
									<Badge variant={getUserRoleBadgeVariant(user.role.code)}>
										{user.role.label}
									</Badge>
								</TableCell>
								<TableCell>
									<Badge variant={user.isActive ? "success" : "destructive"}>
										{user.isActive ? "Active" : "Inactive"}
									</Badge>
								</TableCell>
								<TableCell className="text-right">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="icon" className="size-6">
												<IconEllipsis />
												<span className="sr-only">Open actions</span>
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem asChild>
												<Link to="/users/$userId" params={{ userId: user.id }}>
													Edit
												</Link>
											</DropdownMenuItem>
											<DropdownMenuItem
												variant={user.isActive ? "destructive" : "default"}
												onClick={() => {
													setSelectedUser(user);
												}}
											>
												{user.isActive ? "Deactivate" : "Reactivate"}
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>

			<Dialog
				open={selectedUser !== null}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedUser(null);
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Are you sure you want to{" "}
							{selectedUser?.isActive ? "deactivate" : "reactivate"} this
							account?
						</DialogTitle>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="secondary" className="w-25">
								No
							</Button>
						</DialogClose>

						<Button
							variant={selectedUser?.isActive ? "destructive" : "default"}
							className="w-25"
							onClick={handleAction}
							disabled={props.isPending}
						>
							{props.isPending ? "Processing..." : "Yes"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
