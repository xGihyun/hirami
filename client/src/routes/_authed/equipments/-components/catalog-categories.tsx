import type { JSX } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LabelMedium, TitleSmall } from "@/components/typography";
import { Toggle } from "@/components/ui/toggle";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
	categories: string[];
};

export function CatalogCategories(props: Props): JSX.Element {
	const search = useSearch({ from: "/_authed/equipments/" });
	const navigate = useNavigate({ from: "/equipments" });

	async function toggleEquipment(name: string): Promise<void> {
		if (name === "All") {
			await navigate({ to: "/equipments" });
			return;
		}

		await navigate({
			search: (prev) => ({
				...prev,
				categories: prev.categories.includes(name)
					? prev.categories.filter((n) => n !== name)
					: [...prev.categories, name],
			}),
		});
	}

	return (
		<section className="mb-2">
			<div className="mb-2.5 flex items-center justify-between gap-2">
				<TitleSmall>Categories</TitleSmall>

				<Dialog>
					<DialogTrigger>
						<LabelMedium>See More</LabelMedium>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle className="text-start">Categories</DialogTitle>
						</DialogHeader>

						<div className="flex flex-wrap gap-2 w-full">
							<Toggle
								key={"All"}
								variant="outline"
								onPressedChange={() => toggleEquipment("All")}
								pressed={search.categories.length === 0}
							>
								All
							</Toggle>

							{props.categories.map((name) => (
								<Toggle
									key={name}
									variant="outline"
									pressed={search.categories.includes(name)}
									onPressedChange={() => toggleEquipment(name)}
								>
									{name}
								</Toggle>
							))}
						</div>
					</DialogContent>
				</Dialog>
			</div>

			<ScrollArea>
				<div className="flex gap-2 mb-2">
					<Toggle
						key={"All"}
						variant="outline"
						onPressedChange={() => toggleEquipment("All")}
						pressed={search.categories.length === 0}
					>
						All
					</Toggle>

					{props.categories.map((name) => (
						<Toggle
							key={name}
							variant="outline"
							pressed={search.categories.includes(name)}
							onPressedChange={() => toggleEquipment(name)}
						>
							{name}
						</Toggle>
					))}
				</div>

				<ScrollBar orientation="horizontal" hidden />
			</ScrollArea>
		</section>
	);
}
