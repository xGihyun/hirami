import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesQuery, createCategory, deleteCategory, updateCategory } from "@/lib/equipment/api";
import { H1, LabelLarge, TitleSmall } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, type JSX } from "react";
import { IconTrash, IconPlus, IconArrowLeft, IconEdit, IconCheck, IconX, IconEllipsis } from "@/lib/icons";
import { ComponentLoading } from "@/components/loading";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Success } from "@/components/success";
import { Failed } from "@/components/failed";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authed/equipments/categories")({
	component: ManageCategoriesPage,
});

function ManageCategoriesPage(): JSX.Element {
	const queryClient = useQueryClient();
	const categories = useQuery(categoriesQuery);
	
	const [newName, setNewName] = useState("");
	const [newBgColor, setNewBgColor] = useState("#888888");
	const [newFgColor, setNewFgColor] = useState("#FFFFFF");

	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editBgColor, setEditBgColor] = useState("#888888");
	const [editFgColor, setEditFgColor] = useState("#FFFFFF");

	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const createMutation = useMutation({
		mutationFn: createCategory,
		onSuccess: (res) => {
			if (res.code === 201) {
				queryClient.invalidateQueries(categoriesQuery);
				setNewName("");
				setNewBgColor("#888888");
				setNewFgColor("#FFFFFF");
			}
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateCategory,
		onSuccess: (res) => {
			if (res.code === 200) {
				queryClient.invalidateQueries(categoriesQuery);
				setEditingId(null);
			}
		},
	});

	const deleteMutation = useMutation({
		mutationFn: deleteCategory,
		onSuccess: (res) => {
			if (res.code === 200) {
				queryClient.invalidateQueries(categoriesQuery);
			}
			setIsConfirmOpen(false);
		},
		onError: () => {
			setIsConfirmOpen(false);
		},
	});

	function handleCreate(e: React.FormEvent) {
		e.preventDefault();
		if (!newName.trim()) return;
		createMutation.mutate({ 
			name: newName, 
			backgroundColor: newBgColor, 
			foregroundColor: newFgColor 
		});
	}

	function handleUpdate(e: React.FormEvent) {
		e.preventDefault();
		if (!editingId || !editName.trim()) return;
		updateMutation.mutate({
			id: editingId,
			name: editName,
			backgroundColor: editBgColor,
			foregroundColor: editFgColor
		});
	}

	function startEditing(category: any) {
		setEditingId(category.id);
		setEditName(category.name);
		setEditBgColor(category.backgroundColor || "#888888");
		setEditFgColor(category.foregroundColor || "#FFFFFF");
	}

	function handleDelete(id: string) {
		setDeleteId(id);
		setIsConfirmOpen(true);
	}

	function confirmDelete() {
		if (deleteId) {
			deleteMutation.mutate(deleteId);
		}
	}

	if (createMutation.isError || updateMutation.isError || deleteMutation.isError) {
		const mutation = createMutation.isError ? createMutation : (updateMutation.isError ? updateMutation : deleteMutation);
		return (
			<Failed
				header={
					createMutation.isError
						? "Category creation failed."
						: (updateMutation.isError ? "Category update failed." : "Category deletion failed.")
				}
				fn={mutation.reset}
				retry={() => mutation.mutate(mutation.variables as any)}
				backLink="/equipments/categories"
				backMessage="or return to Categories"
				className="absolute inset-0 z-50 bg-background md:px-10 md:pt-[calc(1.25rem+env(safe-area-inset-top))]"
			/>
		);
	}

	if (createMutation.isSuccess || updateMutation.isSuccess || deleteMutation.isSuccess) {
		const mutation = createMutation.isSuccess ? createMutation : (updateMutation.isSuccess ? updateMutation : deleteMutation);
		return (
			<Success
				header={
					createMutation.isSuccess
						? "Category created successfully."
						: (updateMutation.isSuccess ? "Category updated successfully." : "Category deleted successfully.")
				}
				fn={mutation.reset}
				backLink="/equipments/categories"
				className="absolute inset-0 z-50 bg-background md:px-10 md:pt-[calc(1.25rem+env(safe-area-inset-top))]"
			/>
		);
	}

	return (
		<div className="relative space-y-6">
			<Button
				variant="ghost"
				size="icon"
				className="size-15"
				asChild
			>
				<Link to="/equipments">
					<IconArrowLeft className="size-8" />
				</Link>
			</Button>

			<header className="text-center mb-10">
				<H1>Manage Categories</H1>
				<TitleSmall>
					Add, edit or remove equipment categories to organize your catalog.
				</TitleSmall>
			</header>

			<ConfirmDialog
				open={isConfirmOpen}
				onOpenChange={setIsConfirmOpen}
				onConfirm={confirmDelete}
				title="Delete Category"
				description="Are you sure you want to delete this category? This will remove it from all equipment."
				variant="destructive"
				isLoading={deleteMutation.isPending}
			/>

			<div className="max-w-5xl mx-auto space-y-8">
				<section className="bg-background p-6 rounded-xl border border-accent shadow-sm">
					<div className="flex flex-col md:flex-row gap-8">
						<div className="md:w-1/3">
							<LabelLarge className="text-xl mb-2 block">Add Category</LabelLarge>
							<TitleSmall className="text-muted-foreground">Create a new category with custom colors.</TitleSmall>
						</div>
						
						<div className="flex-1">
							<form onSubmit={handleCreate} className="space-y-4">
								<div className="space-y-2">
									<LabelLarge>Category Name</LabelLarge>
									<Input
										value={newName}
										onChange={(e) => setNewName(e.target.value)}
										placeholder="e.g. Ball"
										className="bg-card border-accent"
									/>
								</div>
								
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<LabelLarge>Background Color</LabelLarge>
										<div className="flex gap-2 items-center">
											<Input
												type="color"
												value={newBgColor}
												onChange={(e) => setNewBgColor(e.target.value)}
												className="w-12 p-1 h-10 cursor-pointer bg-card border-accent"
											/>
											<span className="text-xs font-open-sans uppercase text-muted-foreground">{newBgColor}</span>
										</div>
									</div>
									<div className="space-y-2">
										<LabelLarge>Foreground Color</LabelLarge>
										<div className="flex gap-2 items-center">
											<Input
												type="color"
												value={newFgColor}
												onChange={(e) => setNewFgColor(e.target.value)}
												className="w-12 p-1 h-10 cursor-pointer bg-card border-accent"
											/>
											<span className="text-xs font-open-sans uppercase text-muted-foreground">{newFgColor}</span>
										</div>
									</div>
								</div>

								<div className="pt-2">
									<LabelLarge className="text-xs text-muted-foreground uppercase mb-1 block">Preview</LabelLarge>
									<div 
										className="p-3 rounded-lg text-center font-bold shadow-sm transition-all"
										style={{ backgroundColor: newBgColor, color: newFgColor }}
									>
										{newName || "Category Name"}
									</div>
								</div>

								<Button type="submit" className="w-full shadow-none mt-2" disabled={createMutation.isPending || !newName.trim()}>
									<IconPlus className="size-4 mr-2" />
									Add Category
								</Button>
							</form>
						</div>
					</div>
				</section>

				<section className="bg-background p-6 rounded-xl border border-accent shadow-sm">
					<div className="flex flex-col md:flex-row gap-8">
						<div className="md:w-1/3">
							<LabelLarge className="text-xl mb-2 block">Existing Categories</LabelLarge>
							<TitleSmall className="text-muted-foreground">View and manage all your current categories.</TitleSmall>
						</div>

						<div className="flex-1 bg-card rounded-xl border border-accent overflow-hidden">
							{categories.isPending ? (
								<div className="p-12">
									<ComponentLoading />
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow className="hover:bg-transparent">
											<TableHead className="w-[40%] pl-6">Name</TableHead>
											<TableHead className="hidden sm:table-cell">Colors (BG / FG)</TableHead>
											<TableHead className="text-right pr-6">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{categories.data?.map((category) => (
											<TableRow key={category.id} className="group transition-colors">
												<TableCell className="pl-6 py-4">
													{editingId === category.id ? (
														<Input
															value={editName}
															onChange={(e) => setEditName(e.target.value)}
															className="h-9 py-0 px-3 text-sm bg-background border-accent"
															autoFocus
														/>
													) : (
														<div 
															className="px-3 py-1 rounded-full text-xs font-bold inline-block shadow-sm transition-all" 
															style={{ 
																backgroundColor: category.backgroundColor || "#888888",
																color: category.foregroundColor || "#FFFFFF"
															}} 
														>
															{category.name}
														</div>
													)}
												</TableCell>
												<TableCell className="hidden sm:table-cell py-4">
													{editingId === category.id ? (
														<div className="flex items-center gap-4">
															<div className="flex items-center gap-2">
																<Input
																	type="color"
																	value={editBgColor}
																	onChange={(e) => setEditBgColor(e.target.value)}
																	className="size-8 p-1 cursor-pointer bg-background border-accent"
																	/>
																	<span className="text-[10px] font-open-sans uppercase text-muted-foreground">{editBgColor}</span>
																	</div>
																	<div className="flex items-center gap-2">
																	<Input
																	type="color"
																	value={editFgColor}
																	onChange={(e) => setEditFgColor(e.target.value)}
																	className="size-8 p-1 cursor-pointer bg-background border-accent"
																	/>
																	<span className="text-[10px] font-open-sans uppercase text-muted-foreground">{editFgColor}</span>
																	</div>
																	</div>
																	) : (
																	<div className="flex items-center gap-3 font-open-sans text-xs text-muted-foreground">
																	<div className="flex items-center gap-1.5">
																	<div className="size-3 rounded-full border border-accent" style={{ backgroundColor: category.backgroundColor || "#888888" }} />
																	<span>{category.backgroundColor || "#888888"}</span>
																	</div>
																	<span className="text-accent">/</span>
																	<div className="flex items-center gap-1.5">
																	<div className="size-3 rounded-full border border-accent" style={{ backgroundColor: category.foregroundColor || "#FFFFFF" }} />
																	<span>{category.foregroundColor || "#FFFFFF"}</span>
																	</div>
																	</div>
																	)}												</TableCell>
												<TableCell className="text-right pr-6 py-4">
													{editingId === category.id ? (
														<div className="flex justify-end gap-1">
															<Button
																size="icon"
																variant="ghost"
																className="size-9 text-primary hover:bg-primary/10"
																onClick={handleUpdate}
																disabled={updateMutation.isPending || !editName.trim()}
															>
																<IconCheck className="size-5" />
															</Button>
															<Button
																size="icon"
																variant="ghost"
																className="size-9 text-muted-foreground hover:bg-muted"
																onClick={() => setEditingId(null)}
															>
																<IconX className="size-5" />
															</Button>
														</div>
													) : (
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="ghost"
																	size="icon"
																	className="size-9 hover:bg-accent"
																>
																	<IconEllipsis className="size-5 text-muted-foreground" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end" className="w-32">
																<DropdownMenuItem onClick={() => startEditing(category)}>
																	<IconEdit className="mr-2 size-4" />
																	Edit
																</DropdownMenuItem>
																<DropdownMenuItem 
																	variant="destructive"
																	onClick={() => handleDelete(category.id)}
																>
																	<IconTrash className="mr-2 size-4" />
																	Delete
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													)}
												</TableCell>
											</TableRow>
										))}
										{categories.data?.length === 0 && (
											<TableRow>
												<TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">
													No categories found.
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							)}
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
