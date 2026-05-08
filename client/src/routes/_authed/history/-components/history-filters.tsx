import { useState, type JSX } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { IconFilter } from "@/lib/icons";
import { EquipmentSelector } from "./equipment-selector";
import { format } from "date-fns";
import { LabelSmall } from "@/components/typography";

export function HistoryFilters(): JSX.Element {
	const searchParams = useSearch({ from: "/_authed/history/" });
	const navigate = useNavigate({ from: "/history" });

	const [open, setOpen] = useState(false);

	const startDate = searchParams.startDate ? new Date(searchParams.startDate) : undefined;
	const endDate = searchParams.endDate ? new Date(searchParams.endDate) : undefined;
	const equipmentIds = searchParams.equipmentIds ? searchParams.equipmentIds.split(",") : [];

	async function updateFilters(updates: {
		startDate?: Date;
		endDate?: Date;
		equipmentIds?: string[];
	}) {
		await navigate({
			search: (prev) => ({
				...prev,
				startDate: updates.startDate?.toISOString() || prev.startDate,
				endDate: updates.endDate?.toISOString() || prev.endDate,
				equipmentIds: updates.equipmentIds?.join(",") || prev.equipmentIds,
			}),
		});
	}

	function clearFilters() {
		navigate({
			search: (prev) => ({
				...prev,
				startDate: undefined,
				endDate: undefined,
				equipmentIds: undefined,
			}),
		});
		setOpen(false);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className="size-12 bg-card text-card-foreground border border-accent shadow-none relative"
				>
					<IconFilter className="size-5" />
					{(searchParams.startDate || searchParams.endDate || searchParams.equipmentIds) && (
						<span className="absolute top-1 right-1 size-2 bg-primary rounded-full" />
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[350px] p-4 space-y-4" align="end">
				<div className="space-y-2">
					<LabelSmall>Date Range</LabelSmall>
					<div className="flex gap-2">
						<div className="flex-1 space-y-1">
							<LabelSmall className="text-xs text-muted-foreground">From</LabelSmall>
							<Popover>
								<PopoverTrigger asChild>
									<Button variant="outline" className="w-full text-left font-normal text-xs h-8">
										{startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0">
									<Calendar
										mode="single"
										selected={startDate}
										onSelect={(date) => updateFilters({ startDate: date })}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>
						<div className="flex-1 space-y-1">
							<LabelSmall className="text-xs text-muted-foreground">To</LabelSmall>
							<Popover>
								<PopoverTrigger asChild>
									<Button variant="outline" className="w-full text-left font-normal text-xs h-8">
										{endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0">
									<Calendar
										mode="single"
										selected={endDate}
										onSelect={(date) => updateFilters({ endDate: date })}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>
					</div>
				</div>

				<div className="space-y-2">
					<LabelSmall>Specific Equipments</LabelSmall>
					<EquipmentSelector
						selectedEquipmentIds={equipmentIds}
						onChange={(ids) => updateFilters({ equipmentIds: ids })}
					/>
				</div>

				<div className="flex justify-between pt-2">
					<Button variant="ghost" size="sm" onClick={clearFilters}>
						Clear All
					</Button>
					<Button size="sm" onClick={() => setOpen(false)}>
						Done
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
