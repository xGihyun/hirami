import { useQuery } from "@tanstack/react-query";
import { equipmentsQuery } from "@/lib/equipment/api";
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

type EquipmentSelectorProps = {
	selectedEquipmentIds: string[];
	onChange: (ids: string[]) => void;
};

export function EquipmentSelector({
	selectedEquipmentIds,
	onChange,
}: EquipmentSelectorProps) {
	const [open, setOpen] = useState(false);
	const { data: equipments } = useQuery(equipmentsQuery({ names: [] }));

	const toggleEquipment = (id: string) => {
		const newIds = selectedEquipmentIds.includes(id)
			? selectedEquipmentIds.filter((itemId) => itemId !== id)
			: [...selectedEquipmentIds, id];
		onChange(newIds);
	};

	const selectedEquipments = equipments?.filter((e) =>
		selectedEquipmentIds.includes(e.equipment.id),
	).map(e => e.equipment);

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
						{selectedEquipmentIds.length > 0
							? "Add more equipments..."
							: "Select equipments..."}
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[300px] p-0" align="start">
					<Command>
						<CommandInput placeholder="Search equipment..." />
						<CommandList>
							<CommandEmpty>No equipment found.</CommandEmpty>
							<CommandGroup>
								{equipments?.map(({ equipment }) => (
									<CommandItem
										key={equipment.id}
										value={`${equipment.brand} ${equipment.model} ${equipment.name}`}
										onSelect={() => {
											toggleEquipment(equipment.id);
										}}
									>
										<Check
											className={cn(
												"mr-2 h-4 w-4",
												selectedEquipmentIds.includes(equipment.id)
													? "opacity-100"
													: "opacity-0",
											)}
										/>
										<div className="flex flex-col">
											<span>{equipment.brand} {equipment.model}</span>
											<span className="text-xs text-muted-foreground">{equipment.name}</span>
										</div>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			<div className="flex flex-wrap gap-1">
				{selectedEquipments?.map((equipment) => (
					<Badge
						key={equipment.id}
						variant="secondary"
						className="flex items-center gap-1"
					>
						{equipment.brand} {equipment.model}
						<button
							type="button"
							className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
							onClick={() => toggleEquipment(equipment.id)}
						>
							×
						</button>
					</Badge>
				))}
			</div>
		</div>
	);
}
