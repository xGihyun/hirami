import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesQuery, createCategory, deleteCategory } from "@/lib/equipment/api";
import { H1, LabelLarge, TitleSmall } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, type JSX } from "react";
import { IconTrash, IconPlus } from "@/lib/icons";
import { Card } from "@/components/ui/card";
import { ComponentLoading } from "@/components/loading";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/categories/")({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	const queryClient = useQueryClient();
	const categories = useQuery(categoriesQuery);
	const [newName, setNewName] = useState("");
	const [newColor, setNewColor] = useState("#888888");

	const createMutation = useMutation({
		mutationFn: createCategory,
		onSuccess: () => {
			queryClient.invalidateQueries(categoriesQuery);
			setNewName("");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: deleteCategory,
		onSuccess: () => {
			queryClient.invalidateQueries(categoriesQuery);
		},
	});

	function handleCreate(e: React.FormEvent) {
		e.preventDefault();
		if (!newName.trim()) return;
		createMutation.mutate({ name: newName, color: newColor });
	}

	function handleDelete(id: string) {
		if (confirm("Are you sure you want to delete this category?")) {
			deleteMutation.mutate(id);
		}
	}

	return (
		<div className="space-y-8 max-w-2xl mx-auto">
			<header>
				<H1>Manage Categories</H1>
				<TitleSmall>Add or remove equipment categories.</TitleSmall>
			</header>

			<Card className="p-6">
				<form onSubmit={handleCreate} className="flex gap-4 items-end">
					<div className="flex-1 space-y-2">
						<LabelLarge>Category Name</LabelLarge>
						<Input
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							placeholder="e.g. Ball"
						/>
					</div>
					<div className="space-y-2">
						<LabelLarge>Color</LabelLarge>
						<Input
							type="color"
							value={newColor}
							onChange={(e) => setNewColor(e.target.value)}
							className="w-20 p-1 h-10"
						/>
					</div>
					<Button type="submit" disabled={createMutation.isPending || !newName.trim()}>
						<IconPlus className="size-4 mr-2" />
						Add
					</Button>
				</form>
			</Card>

			<div className="grid gap-4">
				{categories.isPending ? (
					<ComponentLoading />
				) : (
					categories.data?.map((category) => (
						<Card key={category.id} className="p-4 flex justify-between items-center shadow-sm">
							<div className="flex items-center gap-4">
								<div 
									className="size-4 rounded-full" 
									style={{ backgroundColor: category.color || "#888888" }} 
								/>
								<LabelLarge>{category.name}</LabelLarge>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => handleDelete(category.id)}
								disabled={deleteMutation.isPending}
							>
								<IconTrash className="size-5 text-destructive" />
							</Button>
						</Card>
					))
				)}
			</div>
		</div>
	);
}
