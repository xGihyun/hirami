import { queryOptions } from "@tanstack/react-query";
import { BACKEND_URL, type ApiResponse } from "../api";

export type Borrower = {
	id: string;
	firstName: string;
	middleName?: string;
	lastName: string;
	avatarUrl?: string;
};

type BorrowedEquipment = {
	borrowRequestItemId: string;
	equipmentTypeId: string;
	name: string;
	brand?: string;
	model?: string;
	imageUrl?: string;
	quantity: number;
};

type BorrowRequest = {
	id: string;
	createdAt: string;
	borrower: Borrower;
	equipments: BorrowedEquipment[];
	location: string;
	purpose: string;
	expectedReturnAt: string;
};

async function getBorrowRequests(): Promise<BorrowRequest[]> {
	const response = await fetch(`${BACKEND_URL}/borrow-requests`, {
		method: "GET",
	});

	const result: ApiResponse<BorrowRequest[]> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result.data;
}

export const borrowRequestsQuery = queryOptions({
	queryKey: ["borrow-requests"],
	queryFn: getBorrowRequests,
});
