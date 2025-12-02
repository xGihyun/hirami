import type { User } from "@/lib/user";
import type { JSX } from "react";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@/components/ui/item";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toImageUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { getUserRoleBadgeVariant } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { IconMoreHorizontal, IconTrash } from "@/lib/icons";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
	users: User[];
};

export function UserList(props: Props): JSX.Element {
	return (
		<section className="space-y-2">
			{props.users.map((user) => {
				return <UserItem user={user} />;
			})}
		</section>
	);
}

type UserItemProps = {
	user: User;
};

function UserItem(props: UserItemProps): JSX.Element {
	const avatarUrl = toImageUrl(props.user.avatarUrl);
	const initials = props.user.firstName[0] + props.user.lastName[0];

	return (
		<Item className="shadow-item rounded-2xl">
			<ItemMedia>
				<Avatar className="size-16">
					<AvatarImage src={avatarUrl} />
					<AvatarFallback className="text-xl">{initials}</AvatarFallback>
				</Avatar>
			</ItemMedia>
			<ItemContent>
				<ItemTitle>
					{props.user.firstName} {props.user.middleName} {props.user.lastName}
				</ItemTitle>
				<ItemDescription>{props.user.email}</ItemDescription>
				<Badge variant={getUserRoleBadgeVariant(props.user.role.code)}>
					{props.user.role.label}
				</Badge>
			</ItemContent>
			<ItemActions>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost">
							<span className="sr-only">Open menu</span>
							<IconMoreHorizontal className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<Link to="/users/$userId" params={{ userId: props.user.id }}>
								Edit
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem>Deactivate</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</ItemActions>
		</Item>
	);
}
