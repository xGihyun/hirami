import { toImageUrl } from "@/lib/api";
import { hiramiLogoDark } from "@/lib/assets";
import type { User } from "@/lib/user";
import type { JSX } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
	user: User;
};

export function CatalogHeader(props: Props): JSX.Element {
	return (
		<header className="flex w-full items-center justify-between">
			<img src={hiramiLogoDark} alt="Hirami logo" className="size-8" />

			<Avatar className="size-8">
				<AvatarImage src={toImageUrl(props.user.avatarUrl)} />
				<AvatarFallback>
					{props.user.firstName[0]}
					{props.user.lastName[0]}
				</AvatarFallback>
			</Avatar>
		</header>
	);
}
