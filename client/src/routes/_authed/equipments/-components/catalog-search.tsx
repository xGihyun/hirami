import { SearchInput } from "@/components/search-input";
import { H1, TitleSmall } from "@/components/typography";
import type { User } from "@/lib/user";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState, type JSX } from "react";

type Props = {
	user: User;
};

export function CatalogSearch(props: Props): JSX.Element {
	const searchParams = useSearch({ from: "/_authed/equipments/" });
	const navigate = useNavigate({ from: "/equipments" });
	const [inputValue, setInputValue] = useState<string>(
		searchParams.search || "",
	);

	async function onSubmit(e: React.FormEvent): Promise<void> {
		e.preventDefault();

		await navigate({
			search: (prev) => ({
				...prev,
				search: inputValue,
			}),
		});
	}

	return (
		<div className="space-y-4">
			<section>
				<TitleSmall className="text-muted">
					Welcome back {props.user.firstName},
				</TitleSmall>
				<H1>Explore our Catalog</H1>
			</section>

			<form onSubmit={onSubmit}>
				<SearchInput
					placeholder="Search for items"
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
				/>
			</form>
		</div>
	);
}
