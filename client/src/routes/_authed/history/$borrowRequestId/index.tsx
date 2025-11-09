import { createFileRoute, Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	borrowRequestByIdQuery,
	BorrowRequestStatus,
	type BorrowedEquipment,
} from "@/lib/equipment/borrow";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BACKEND_URL, toImageUrl } from "@/lib/api";
import type { Equipment } from "@/lib/equipment";
import { cn } from "@/lib/utils";
import { H2, LabelLarge, LabelSmall } from "@/components/typography";
import { Badge } from "@/components/ui/badge";
import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@/lib/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/_authed/history/$borrowRequestId/")({
	component: RouteComponent,
	loader: ({ context, params }) => {
		context.queryClient.prefetchQuery(
			borrowRequestByIdQuery(params.borrowRequestId),
		);
	},
});

function RouteComponent(): JSX.Element {
	const params = Route.useParams();
	const borrowRequest = useSuspenseQuery(
		borrowRequestByIdQuery(params.borrowRequestId),
	);

	const borrower = borrowRequest.data.borrower;
	const borrowerInitials = borrower.firstName[0] + borrower.lastName[0];

	return (
		<div className="space-y-4 pb-12">
			<Button variant="ghost" size="icon" className="size-15 mb-0">
				<Link to="/history">
					<IconArrowLeft className="size-8" />
				</Link>
			</Button>

			<section className="w-fit mx-auto">
				<Avatar className="size-30 mx-auto">
					<AvatarImage src={toImageUrl(borrower.avatarUrl)} />
					<AvatarFallback className="font-montserrat-bold">
						{borrowerInitials}
					</AvatarFallback>
				</Avatar>

				<H2 className="text-center">
					{borrower.firstName} {borrower.lastName}
				</H2>
			</section>

			<section className="space-y-2 h-full">
				{borrowRequest.data.equipments.map((equipment) => {
					return (
						<Equipment
							key={equipment.borrowRequestItemId}
							equipment={equipment}
						/>
					);
				})}
			</section>

			<Separator />

			<section className="space-y-4">
				<div className="space-y-2">
					<Label>Location</Label>
					<Input value={borrowRequest.data.location} readOnly />
				</div>

				<div className="space-y-2">
					<Label>Purpose</Label>
					<Input value={borrowRequest.data.purpose} readOnly />
				</div>
			</section>

			{borrowRequest.data.status === BorrowRequestStatus.Approved ? (
				<Dialog>
					<DialogTrigger asChild>
						<Button className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 left-4 z-50 !shadow-item">
							Show QR Code
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Scan QR Code</DialogTitle>
							<DialogDescription>
								Have the borrower scan this code to confirm they received the
								equipment.
							</DialogDescription>
						</DialogHeader>

						<QRCodeSVG
							value={borrowRequest.data.id}
							className="w-full size-60"
						/>
					</DialogContent>
				</Dialog>
			) : null}
		</div>
	);
}

type EquipmentProps = {
	equipment: BorrowedEquipment;
	className?: string;
};

function Equipment(props: EquipmentProps): JSX.Element {
	const equipmentImage = props.equipment.imageUrl
		? `${BACKEND_URL}${props.equipment.imageUrl}`
		: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

	return (
		<div
			className={cn(
				"flex items-center gap-2 justify-between bg-card rounded-2xl p-4 shadow-item",
				props.className,
			)}
		>
			<div className="flex items-center gap-2 w-full">
				<img
					src={equipmentImage}
					alt={`${props.equipment.name} ${props.equipment.brand}`}
					className="size-16 object-cover"
				/>

				<div className="flex flex-col w-full">
					<LabelLarge>{props.equipment.brand}</LabelLarge>

					<LabelSmall className="text-muted group-has-data-[state=checked]:text-primary-foreground">
						{props.equipment.name}
					</LabelSmall>
				</div>
			</div>

			<Badge className="mt-1">Quantity ({props.equipment.quantity})</Badge>
		</div>
	);
}
