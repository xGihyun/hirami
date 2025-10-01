import { equipmentsQuery } from "@/lib/equipment";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authed/equipments/")({
	component: RouteComponent,
	loader: ({ context }) => {
		const equipments = context.queryClient.ensureQueryData(equipmentsQuery);
		return equipments;
	},
});

function RouteComponent() {
	const { data } = useSuspenseQuery(equipmentsQuery);

	console.log(data);

	return (
		<div className="px-4 lg:px-10 py-5">
			<h1 className="text-4xl font-bold mb-10">Equipments</h1>

			<div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
				{data.data.map((equipment) => {
					return (
						<Card key={equipment.id}>
							<CardHeader>
								<CardTitle>{equipment.name}</CardTitle>
								{equipment.brand ? (
									<CardDescription>{equipment.brand}</CardDescription>
								) : null}
							</CardHeader>
							<CardContent>
								<p>Quantity: {equipment.quantity}</p>
								<Badge variant={equipment.borrower ? "secondary" : "default"}>
									{equipment.status}
								</Badge>
								{equipment.borrower ? (
									<p>
										Borrowed By: {equipment.borrower.firstName}{" "}
										{equipment.borrower.lastName}
									</p>
								) : null}
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
