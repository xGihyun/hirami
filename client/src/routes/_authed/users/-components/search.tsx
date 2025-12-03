import { SearchInput } from "@/components/search-input";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type JSX } from "react";

export function Search(): JSX.Element {
	const searchParams = useSearch({ from: "/_authed/users/" });
	const navigate = useNavigate({ from: "/users" });
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
		<form onSubmit={onSubmit} className="w-full">
			<SearchInput
				placeholder="Search for users"
				value={inputValue}
				onChange={(e) => setInputValue(e.target.value)}
			/>
		</form>
	);
}
