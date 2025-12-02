import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@/lib/icons";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { JSX } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toImageUrl } from "@/lib/api";
import type { EquipmentWithBorrower } from "@/lib/equipment";
import { Caption, H2, TitleSmall } from "@/components/typography";
import { Separator } from "@/components/ui/separator";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export const Route = createFileRoute("/_authed/equipments/$equipmentId/")({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	const equipment: EquipmentWithBorrower = {
		id: "d8d4de7d-3e56-4f94-b0af-5e5185b83098",
		name: "Volleyball",
		brand: "Mikasa",
		imageUrl: "/uploads/equipments/1429.jpg",
		quantity: 4,
		borrowers: [
			{
				quantity: 1,
				borrower: {
					firstName: "Shammy Kierson",
					lastName: "Suyat",
					id: "ee584a9d-14ae-4975-80be-3dd1d2467e58",
				},
				expectedReturnAt: `${new Date()}`,
			},
		],
	};

	return (
		<main className="space-y-4">
			<Button variant="ghost" size="icon" className="size-15 mb-0">
				<Link to="/equipments">
					<IconArrowLeft className="size-8" />
				</Link>
			</Button>

			<section className="w-fit mx-auto space-y-2.5">
				<div className="flex flex-col items-center">
					<Avatar className="size-30 mx-auto">
						<AvatarImage src={toImageUrl(equipment.imageUrl)} />
						<AvatarFallback />
					</Avatar>

					<H2 className="text-center">
						{equipment.name} {equipment.brand} {equipment.model}
					</H2>
				</div>

				<div className="text-center text-muted">
					<Caption>Brand: {equipment.brand}</Caption>
				</div>
			</section>

			<Separator />

			<section>
				<TitleSmall>Current Borrowers:</TitleSmall>

				<div className="space-y-2.5">
					{equipment.borrowers.map((eq) => {
						const borrower = eq.borrower;
						const initials = borrower.firstName[0] + borrower.lastName[0];

						return (
							<Item className="shadow-item rounded-2xl">
								<ItemMedia>
									<Avatar className="size-16">
										<AvatarImage src={toImageUrl(borrower.avatarUrl)} />
										<AvatarFallback className="text-xl">
											{initials}
										</AvatarFallback>
									</Avatar>
								</ItemMedia>

								<ItemContent>
									<ItemTitle>
										{borrower.firstName}
										{borrower.middleName} {borrower.lastName}
									</ItemTitle>
									<ItemDescription>
										<span className="font-montserrat-bold">
											Will Return On:
										</span>

										<span>
                                            {" "}
											{format(eq.expectedReturnAt, "h:mm a")}
                                            {" "}
											at
                                            {" "}
											{format(eq.expectedReturnAt, "MM/d/yyyy")}
										</span>
									</ItemDescription>
									<Badge>Quantity ({eq.quantity})</Badge>
								</ItemContent>
							</Item>
						);
					})}
				</div>
			</section>
		</main>
	);
}
