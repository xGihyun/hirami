import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@/lib/icons";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { JSX } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toImageUrl } from "@/lib/api";
import { Caption, H2, LabelMedium, TitleSmall } from "@/components/typography";
import { Separator } from "@/components/ui/separator";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { getEquipmentByIdQuery } from "@/lib/equipment/api";
import { ComponentLoading } from "@/components/loading";
import { DEFAULT_EQUIPMENT_IMAGE } from "@/lib/equipment/constant";

export const Route = createFileRoute("/_authed/equipments/$equipmentId/")({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	const params = Route.useParams();
	const equipmentQuery = useQuery(getEquipmentByIdQuery(params.equipmentId));

	if (equipmentQuery.isLoading) {
		return <ComponentLoading />;
	}

	if (equipmentQuery.isError) {
		return (
			<LabelMedium className="text-muted text-center mt-10">
				Failed to load equipment.
			</LabelMedium>
		);
	}

	if (!equipmentQuery.data) {
		return (
			<LabelMedium className="text-muted text-center mt-10">
				Equipment not found.
			</LabelMedium>
		);
	}

	const { equipment, requests } = equipmentQuery.data;

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
						<AvatarImage
							src={toImageUrl(equipment.imageUrl) || DEFAULT_EQUIPMENT_IMAGE}
						/>
						<AvatarFallback />
					</Avatar>

					<H2 className="text-center">
						{equipment.name} {equipment.brand} {equipment.model}
					</H2>
				</div>

				{/* <div className="text-center text-muted"> */}
				{/* 	<Caption>Brand: {equipment.brand}</Caption> */}
				{/* </div> */}
			</section>

			<Separator />

			<section>
				<TitleSmall>Current Borrowers:</TitleSmall>

				<div className="space-y-2.5">
					{requests.map((eq) => {
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
											{format(eq.expectedReturnAt, "h:mm a")} at{" "}
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
