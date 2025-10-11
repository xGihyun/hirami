import { queryOptions } from "@tanstack/react-query";
import { BACKEND_URL, type ApiResponse } from "../api";
import type { Equipment } from ".";
import type { User, UserBasicInfo } from "../user";

export type Borrower = {
	id: string;
	firstName: string;
	middleName?: string;
	lastName: string;
	avatarUrl?: string;
};

export type BorrowedEquipment = {
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

enum BorrowRequestStatus {
	Pending = "pending",
	Approved = "approved",
	Rejected = "rejected",
	Fulfilled = "fulfilled",
}

type BorrowTransaction = {
	borrowRequestId: string;
	borrowedAt: string;
	borrower: Borrower;
	equipments: BorrowedEquipment[];
	location: string;
	purpose: string;
	expectedReturnAt: string;
	actualReturnAt?: string;
	status: BorrowRequestStatus;
	borrowReviewedBy: UserBasicInfo;
	returnConfirmedBy?: UserBasicInfo;
	remarks?: string;
};

type GetBorrowHistoryParams = {
	userId?: string;
};

async function getBorrowHistory(
	params: GetBorrowHistoryParams,
): Promise<BorrowTransaction[]> {
	const url = new URL(`${BACKEND_URL}/borrow-history`);
	if (params.userId) {
		url.searchParams.append("userId", params.userId);
	}
	const response = await fetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<BorrowTransaction[]> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result.data;
}

export const borrowHistoryQuery = (params: GetBorrowHistoryParams) =>
	queryOptions({
		queryKey: ["borrow-history", params.userId],
		queryFn: () => getBorrowHistory(params),
	});
