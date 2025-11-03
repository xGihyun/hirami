import { SearchInput } from "@/components/search-input";
import { H1, TitleSmall } from "@/components/typography";
import type { User } from "@/lib/user";
import type { JSX } from "react";

type Props = {
	user: User;
};

export function CatalogSearch(props: Props): JSX.Element {
	return (
		<div className="space-y-4">
			<section>
				<TitleSmall className="text-muted">
					Welcome, {props.user.firstName}
				</TitleSmall>
				<H1>Explore our Catalog</H1>
			</section>

			<SearchInput placeholder="Search for items" />
		</div>
	);
}
