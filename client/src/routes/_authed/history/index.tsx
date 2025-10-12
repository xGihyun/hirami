import {
	borrowHistoryQuery,
	BorrowRequestStatus,
	type BorrowTransaction,
} from "@/lib/equipment/borrow";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { useState } from "react";
import { Caption, P } from "@/components/typography";
import { BACKEND_URL, toImageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/lib/user";
import { useAuth } from "@/auth";

export const Route = createFileRoute("/_authed/history/")({
	component: RouteComponent,
	loader: ({ context }) => {
		if (context.session.user.role === UserRole.Borrower) {
			context.queryClient.ensureQueryData(
				borrowHistoryQuery({ userId: context.session.user.id }),
			);
			return;
		}
		context.queryClient.ensureQueryData(borrowHistoryQuery({}));
	},
});

function RouteComponent() {
	const auth = useAuth();
	const history = useSuspenseQuery(
		borrowHistoryQuery({
			userId: auth.user?.role === UserRole.Borrower ? auth.user.id : undefined,
		}),
	);

	const [selectedRequest, setSelectedRequest] = useState<BorrowTransaction>();

	return (
		<div className="relative space-y-4">
			<p className="font-montserrat-medium text-sm mb-1">History</p>

			<Drawer>
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
					{history.data.map((transaction) => {
						const borrowerInitials = `${transaction.borrower.firstName[0]}${transaction.borrower.lastName[0]}`;
						const borrowerName = `${transaction.borrower.lastName}, ${transaction.borrower.firstName}`;

						const borrowedDate = new Date(transaction.borrowedAt);
						const returnDate = transaction.actualReturnAt
							? new Date(transaction.actualReturnAt)
							: null;

						const isSameDay =
							returnDate &&
							borrowedDate.toDateString() === returnDate.toDateString();

						const dateDisplay = !returnDate
							? format(borrowedDate, "MMM d, yyyy")
							: isSameDay
								? format(borrowedDate, "MMM d, yyyy")
								: `${format(borrowedDate, "MMM d, yyyy")} - ${format(returnDate, "MMM d")}`;

						return (
							<DrawerTrigger asChild key={transaction.borrowRequestId}>
								<button
									onClick={() => setSelectedRequest(transaction)}
									className="border rounded p-4 text-start bg-card cursor-pointer hover:bg-card/50 transition-colors flex gap-2 items-center justify-between"
								>
									<div className="flex gap-2 items-center">
										<Avatar className="size-12">
											<AvatarImage
												src={toImageUrl(transaction.borrower.avatarUrl)}
											/>
											<AvatarFallback className="font-montserrat-bold">
												{borrowerInitials}
											</AvatarFallback>
										</Avatar>
										<div className="flex flex-col">
											<p className="font-montserrat-bold">{borrowerName}</p>
											<p className="text-sm font-montserrat-medium">
												{dateDisplay}
											</p>
										</div>
									</div>
									<Badge
										variant={
											transaction.status === BorrowRequestStatus.Approved
												? "success"
												: "default"
										}
									>
										{transaction.status}
									</Badge>
								</button>
							</DrawerTrigger>
						);
					})}
				</div>

				<DrawerContent className="space-y-4">
					<DrawerHeader>
						<DrawerTitle className="items-center flex flex-col">
							<Avatar className="size-12">
								<AvatarImage
									src={toImageUrl(selectedRequest?.borrower.avatarUrl)}
								/>
								<AvatarFallback className="font-montserrat-bold">
									{selectedRequest?.borrower.firstName[0]}
									{selectedRequest?.borrower.lastName[0]}
								</AvatarFallback>
							</Avatar>

							<P>
								{selectedRequest?.borrower.firstName}{" "}
								{selectedRequest?.borrower.lastName}
							</P>
						</DrawerTitle>
						<DrawerDescription>
							Borrowed on{" "}
							{selectedRequest &&
								format(selectedRequest.borrowedAt, "MMM d, yyyy - hh:mm:ss a")}
							{selectedRequest?.actualReturnAt && (
								<>
									<br />
									Returned on{" "}
									{format(
										selectedRequest.actualReturnAt,
										"MMM d, yyyy - hh:mm:ss a",
									)}
								</>
							)}
						</DrawerDescription>
					</DrawerHeader>

					{selectedRequest && (
						<div className="px-4 py-4 flex-1 overflow-y-auto">
							<div className="divide-y">
								{selectedRequest.equipments.map((equipment) => {
									const equipmentImage = equipment.imageUrl
										? `${BACKEND_URL}${equipment.imageUrl}`
										: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

									return (
										<div
											key={equipment.equipmentTypeId}
											className="flex items-center gap-2 justify-between py-2"
										>
											<div className="flex items-center gap-2 w-full">
												<img
													src={equipmentImage}
													alt={`${equipment.name} ${equipment.brand}`}
													className="size-20 object-cover"
												/>

												<div className="flex flex-col">
													<p className="font-montserrat-semibold text-base leading-6">
														{equipment.name}
													</p>

													<Caption>
														{equipment.brand}
														{equipment.model ? " - " : null}
														{equipment.model}
													</Caption>
												</div>
											</div>

											<div className="flex items-center gap-1">
												<p className="font-montserrat-bold text-lg">
													{equipment.quantity}
												</p>
												<Caption>pcs.</Caption>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					<DrawerFooter>
						<DrawerClose asChild>
							<Button variant="outline">Close</Button>
						</DrawerClose>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</div>
	);
}
