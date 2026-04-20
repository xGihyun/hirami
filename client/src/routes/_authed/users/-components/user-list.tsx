import type { User } from "@/lib/user";
import type { JSX } from "react";
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
	DropdownMenuSeparator,
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

type Props = {
	users: User[];
};

export function UserList(props: Props): JSX.Element {
	return (
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
						<TableRow className="font-open-sans text-sm leading-6" key={user.id}>
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
								<Badge variant="success">Active</Badge>
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
											<Link
												to="/users/$userId"
												params={{ userId: user.id }}
											>
												Edit
											</Link>
										</DropdownMenuItem>
										<DropdownMenuItem>Duplicate</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem variant="destructive">
											Deactivate
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
