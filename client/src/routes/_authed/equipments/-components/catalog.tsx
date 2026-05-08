import { LabelLarge, LabelMedium, LabelSmall } from "@/components/typography";
import { DEFAULT_EQUIPMENT_IMAGE } from "@/lib/equipment/constant";
import {
	EquipmentStatus,
	type Equipment,
	type EquipmentWithBorrower,
} from "@/lib/equipment/model";
import { type Dispatch, type JSX, type SetStateAction, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toImageUrl } from "@/lib/api";
import { StatusBadge } from "./status-badge";
import type { CheckedState } from "@radix-ui/react-checkbox";
import type { SelectedEquipment } from "..";
import { useAuth } from "@/auth";
import { UserRole } from "@/lib/user";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/number-input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEquipment, equipmentsQuery } from "@/lib/equipment/api";

type Props = {
	equipments: EquipmentWithBorrower[];
	selectedEquipments: SelectedEquipment[];
	setSelectedEquipments: Dispatch<SetStateAction<SelectedEquipment[]>>;
};

export function Catalog(props: Props): JSX.Element {
	const auth = useAuth();
	const queryClient = useQueryClient();

	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const [deleteParams, setDeleteParams] = useState<{ id: string; quantity?: number } | null>(null);
	const [deleteType, setDeleteType] = useState<"partial" | "all">("all");

	const deleteMutation = useMutation({
		mutationFn: ({ id, quantity }: { id: string; quantity?: number }) =>
			deleteEquipment(id, quantity),
		onSuccess: (res) => {
			if (res.code === 200) {
				queryClient.invalidateQueries(equipmentsQuery({ names: [] }));
				toast.success(res.message);
			} else {
				toast.error(res.message);
			}
			setIsConfirmOpen(false);
		},
		onError: (err: any) => {
			toast.error(err.message || "Failed to delete equipment.");
			setIsConfirmOpen(false);
		},
	});

	function handleDelete(id: string, quantity?: number) {
		setDeleteParams({ id, quantity });
		setDeleteType(quantity ? "partial" : "all");
		setIsConfirmOpen(true);
	}

	function confirmDelete() {
		if (deleteParams) {
			deleteMutation.mutate(deleteParams);
		}
	}

	function handleSelect(
		equipment: Equipment,
		quantity: number,
		checked: CheckedState,
	): void {
		if (!checked) {
			props.setSelectedEquipments((prev) => {
				return prev.filter((item) => item.equipment.id !== equipment.id);
			});
			return;
		}

		props.setSelectedEquipments((prev) => {
			return [...prev, { equipment: equipment, quantity: quantity }];
		});
	}

	function isChecked(equipment: Equipment): boolean {
		return props.selectedEquipments.some(
			(item) =>
				item.equipment.id === equipment.id &&
				item.equipment.status === equipment.status,
		);
	}

	const isEquipmentManager = auth.user?.role.code === UserRole.EquipmentManager;

	if (props.equipments.length === 0) {
		return (
			<LabelMedium className="text-muted text-center mt-10">
				No equipment found
			</LabelMedium>
		);
	}

	return (
		<section className="pb-15 !mb-0">
			<div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2">
				{props.equipments.map(({ equipment }) => {
					const key = `${equipment.id}-${equipment.status?.code}`;
					const equipmentImage = equipment.imageUrl
						? toImageUrl(equipment.imageUrl)
						: DEFAULT_EQUIPMENT_IMAGE;

					const cardContent = (className?: string) => (
						<Card
							className={cn(
								"group space-y-2 border-input has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary has-data-[state=checked]:text-primary-foreground relative flex cursor-pointer flex-col gap-1 rounded-md border p-2 shadow-xs outline-none",
								"md:bg-background",
								className,
							)}
						>
							{!isEquipmentManager && (
								<Checkbox
									id={key}
									checked={isChecked(equipment)}
									className="sr-only"
									value={equipment.id}
									onCheckedChange={(checked) =>
										handleSelect(equipment, 1, checked)
									}
									disabled={
										equipment.status?.code !== EquipmentStatus.Available
									}
								/>
							)}

							<div className="space-y-1">
								<div className="w-full h-28 overflow-hidden rounded-md relative">
									<StatusBadge equipment={equipment} />
									<img
										src={equipmentImage}
										alt={`${equipment.name} ${equipment.brand}`}
										className="w-full object-contain aspect-[164/112] h-full"
									/>
								</div>
								<div className="flex flex-col">
									<LabelLarge className="line-clamp-1">
										{equipment.brand ? equipment.brand : "No Brand"}
										{equipment.model ? " " : null}
										{equipment.model}
									</LabelLarge>
									<LabelSmall className="text-muted group-has-data-[state=checked]:text-primary-foreground line-clamp-1">
										{equipment.name}
									</LabelSmall>

									<div className="flex flex-wrap gap-1 mt-1">
										{equipment.categories?.map((cat) => (
											<Badge
												key={cat.id}
												variant="secondary"
												className="text-[0.65rem] px-1 py-0 h-4"
												style={{ backgroundColor: cat.color || undefined }}
											>
												{cat.name}
											</Badge>
										))}
									</div>
								</div>
							</div>
						</Card>
					);

					if (isEquipmentManager) {
						return (
							<Dialog key={key}>
								<DialogTrigger className="w-full h-full text-start">
									{cardContent(
										"hover:bg-tertiary transition active:bg-tertiary",
									)}
								</DialogTrigger>

								<EquipmentManagerDialogContent 
									equipment={equipment} 
									onDelete={handleDelete}
									isDeleting={deleteMutation.isPending}
								/>
							</Dialog>
						);
					}

					if (
						equipment.status?.code === EquipmentStatus.Borrowed ||
						equipment.status?.code === EquipmentStatus.Reserved
					) {
						return (
							<Link
								key={key}
								to="/equipments/$equipmentId"
								params={{ equipmentId: equipment.id }}
							>
								{cardContent("hover:bg-tertiary transition active:bg-tertiary")}
							</Link>
						);
					}

					return (
						<label
							htmlFor={key}
							key={key}
							className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
						>
							{cardContent()}
						</label>
					);
				})}
			</div>

			<ConfirmDialog
				open={isConfirmOpen}
				onOpenChange={setIsConfirmOpen}
				onConfirm={confirmDelete}
				title={deleteType === "partial" ? "Delete Equipment" : "Delete All Records"}
				description={
					deleteType === "partial"
						? `Are you sure you want to permanently delete ${deleteParams?.quantity} of this equipment? This only deletes items that have no borrow history.`
						: "Are you sure you want to permanently delete all records for this equipment type? This action will fail if there is any borrow history associated with it."
				}
				variant="destructive"
				isLoading={deleteMutation.isPending}
			/>
		</section>
	);
}

type EquipmentManagerDialogContentProps = {
	equipment: Equipment;
	onDelete: (id: string, quantity?: number) => void;
	isDeleting: boolean;
};

function EquipmentManagerDialogContent({
	equipment,
	onDelete,
	isDeleting,
}: EquipmentManagerDialogContentProps) {
	const [deleteQuantity, setDeleteQuantity] = useState<number>(1);

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>
					{equipment.brand} {equipment.model}
				</DialogTitle>
				<DialogDescription>{equipment.name}</DialogDescription>
			</DialogHeader>

			<div className="space-y-4">
				<div className="flex flex-wrap gap-2">
					<Button asChild>
						<Link
							to="/equipments/$equipmentId/edit"
							params={{ equipmentId: equipment.id }}
						>
							Edit Equipment
						</Link>
					</Button>

					<Button variant="secondary" asChild>
						<Link
							to="/equipments/$equipmentId"
							params={{ equipmentId: equipment.id }}
						>
							View Borrowers
						</Link>
					</Button>
				</div>

				<div className="border-t pt-4 space-y-2">
					<LabelSmall className="text-muted-foreground">
						Permanent Deletion
					</LabelSmall>
					<div className="flex items-end gap-2">
						<div className="flex-1 space-y-1">
							<LabelSmall>Quantity to delete</LabelSmall>
							<NumberInput
								id="delete-quantity"
								value={deleteQuantity}
								onChange={(val) => setDeleteQuantity(val || 1)}
								maxValue={equipment.quantity}
							/>
						</div>
						<Button
							variant="destructive"
							onClick={() => onDelete(equipment.id, deleteQuantity)}
							disabled={isDeleting || equipment.quantity === 0}
						>
							Delete {deleteQuantity}
						</Button>
					</div>
					<Button
						variant="ghost"
						className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
						onClick={() => onDelete(equipment.id)}
						disabled={isDeleting}
					>
						Delete All Records
					</Button>
				</div>
			</div>
		</DialogContent>
	);
}
