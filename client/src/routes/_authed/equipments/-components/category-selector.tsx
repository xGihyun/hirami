import { useQuery } from "@tanstack/react-query";
import { categoriesQuery } from "@/lib/equipment/api";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type CategorySelectorProps = {
	selectedCategoryIds: string[];
	onChange: (ids: string[]) => void;
};

export function CategorySelector({
	selectedCategoryIds,
	onChange,
}: CategorySelectorProps) {
	const [open, setOpen] = useState(false);
	const { data: categories } = useQuery(categoriesQuery);

	const toggleCategory = (id: string) => {
		const newIds = selectedCategoryIds.includes(id)
			? selectedCategoryIds.filter((itemId) => itemId !== id)
			: [...selectedCategoryIds, id];
		onChange(newIds);
	};

	const selectedCategories = categories?.filter((c) =>
		selectedCategoryIds.includes(c.id),
	);

	return (
		<div className="flex flex-col gap-2">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className="justify-between bg-card"
					>
						{selectedCategoryIds.length > 0
							? "Add more categories..."
							: "Select categories..."}
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-full p-0">
					<Command>
						<CommandInput placeholder="Search category..." />
						<CommandList>
							<CommandEmpty>No category found.</CommandEmpty>
							<CommandGroup>
								{categories?.map((category) => (
									<CommandItem
										key={category.id}
										value={category.name}
										onSelect={() => {
											toggleCategory(category.id);
										}}
									>
										<Check
											className={cn(
												"mr-2 h-4 w-4",
												selectedCategoryIds.includes(category.id)
													? "opacity-100"
													: "opacity-0",
											)}
										/>
										{category.name}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			<div className="flex flex-wrap gap-1">
				{selectedCategories?.map((category) => (
					<Badge
						key={category.id}
						variant="secondary"
						className="flex items-center gap-1"
						style={{ backgroundColor: category.color || undefined }}
					>
						{category.name}
						<button
							type="button"
							className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									toggleCategory(category.id);
								}
							}}
							onMouseDown={(e) => {
								e.preventDefault();
								e.stopPropagation();
							}}
							onClick={() => toggleCategory(category.id)}
						>
							×
						</button>
					</Badge>
				))}
			</div>
		</div>
	);
}
