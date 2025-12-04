import { SearchInput } from "@/components/search-input";
import { H1, TitleSmall } from "@/components/typography";
import { UserRole, type User } from "@/lib/user";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type JSX } from "react";

type Props = {
	user: User;
};

export function CatalogSearch(props: Props): JSX.Element {
	const searchParams = useSearch({ from: "/_authed/equipments/" });
	const navigate = useNavigate({ from: "/equipments" });
	const [inputValue, setInputValue] = useState<string>(
		searchParams.search || "",
	);

	const headerText =
		props.user.role.code === UserRole.Borrower
			? "Explore our Catalog"
			: "Manage Inventory";

	async function onSubmit(e: React.FormEvent): Promise<void> {
		e.preventDefault();

		await navigate({
			search: (prev) => ({
				...prev,
				search: inputValue,
			}),
		});
	}

	useEffect(() => {
		const handler = setTimeout(() => {
			if (searchParams.search !== inputValue) {
				// Using replace: true prevents flooding the history with partial searches
				navigate({
					search: (prev) => ({
						...prev,
						search: inputValue.length > 0 ? inputValue : undefined,
					}),
					replace: true,
				});
			}
		}, 250);

		return () => {
			clearTimeout(handler);
		};
	}, [inputValue]);

	return (
		<div className="space-y-4">
			<section>
				<TitleSmall className="text-muted">
					Welcome back {props.user.firstName},
				</TitleSmall>
				<H1>{headerText}</H1>
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
