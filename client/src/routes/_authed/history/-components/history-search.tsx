import { SearchInput } from "@/components/search-input";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type JSX } from "react";

export function HistorySearch(): JSX.Element {
	const searchParams = useSearch({ from: "/_authed/history/" });
	const navigate = useNavigate({ from: "/history" });
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
	}, [inputValue, searchParams.search]);

	return (
		<form onSubmit={onSubmit} className="w-full">
			<SearchInput
				placeholder="Search for items"
				value={inputValue}
				onChange={(e) => setInputValue(e.target.value)}
			/>
		</form>
	);
}
