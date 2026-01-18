import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { BACKEND_URL, Sort, type ApiResponse } from "../api";
import type { UserBasicInfo } from "../user";
import type { AnomalyResult } from "./anomaly";
import type { Equipment } from ".";

export type BorrowRequestItem = {
	id: string;
    equipment: Equipment;
};

async function getBorrowRequests(): Promise<BorrowTransaction[]> {
	const response = await fetch(`${BACKEND_URL}/borrow-requests`, {
		method: "GET",
	});

	const result: ApiResponse<BorrowTransaction[]> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result.data;
}

export const borrowRequestsQuery = queryOptions({
	queryKey: ["borrow-requests"],
	queryFn: getBorrowRequests,
});

async function getBorrowRequestById(id: string): Promise<BorrowTransaction> {
	const response = await fetch(`${BACKEND_URL}/borrow-requests/${id}`, {
		method: "GET",
	});

	const result: ApiResponse<BorrowTransaction> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result.data;
}

export const borrowRequestByIdQuery = (id: string) =>
	queryOptions({
		queryKey: ["borrow-requests", id],
		queryFn: () => getBorrowRequestById(id),
	});

async function getBorrowRequestByOtp(otp: string): Promise<BorrowTransaction> {
	const response = await fetch(`${BACKEND_URL}/borrow-requests/otp/${otp}`, {
		method: "GET",
	});

	const result: ApiResponse<BorrowTransaction> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result.data;
}

export const borrowRequestByOtpQuery = (otp: string) =>
	queryOptions({
		queryKey: ["borrow-requests", otp],
		queryFn: () => getBorrowRequestByOtp(otp),
	});

export enum BorrowRequestStatus {
	Pending = "pending",
	Approved = "approved",
	Claimed = "claimed",
	Returned = "returned",
	Unclaimed = "unclaimed",
	Rejected = "rejected",
}

export type BorrowRequestStatusDetail = {
	id: number;
	code: BorrowRequestStatus;
	label: string;
};

export type OTP = {
	code: string;
	createdAt: string;
	expiresAt: string;
};

type BorrowReview = {
    reviewedBy: UserBasicInfo;
    reviewedAt: string;
    remarks: string | null;
}

type ReturnConfirmation = {
    id: string;
    confirmedBy: UserBasicInfo;
    confirmedAt: string;
    equipments: Equipment[]; // TODO: Use correct type
    remarks: string | null;
}

export type BorrowTransaction = {
	id: string;
	requestedAt: string;
	borrower: UserBasicInfo;
	requestedItems: BorrowRequestItem[];
	location: string;
	purpose: string;
	status: BorrowRequestStatusDetail;
    review: BorrowReview | null;

	expectedReturnAt: string;
	actualReturnAt: string | null;
	returnConfirmations: ReturnConfirmation[];

	otp: OTP | null;
	anomaly: AnomalyResult | null;
};

type GetBorrowHistoryParams = {
	userId?: string;
	status?: BorrowRequestStatus;
	sort?: Sort;
	sortBy?: string;
	category?: string;
	search?: string;
};

async function getBorrowHistory(
	params: GetBorrowHistoryParams,
): Promise<BorrowTransaction[]> {
	const url = new URL(`${BACKEND_URL}/borrow-history`);

	if (params.userId) {
		url.searchParams.append("userId", params.userId);
	}
	if (params.status) {
		url.searchParams.append("status", params.status);
	}
	if (params.sort) {
		url.searchParams.append("sort", params.sort);
	}
	if (params.sortBy) {
		url.searchParams.append("sortBy", params.sortBy);
	}
	if (params.category) {
		url.searchParams.append("category", params.category);
	}
	if (params.search) {
		url.searchParams.append("search", params.search);
	}
	console.log(url.toString());
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
		queryKey: ["borrow-history", params],
		queryFn: () => getBorrowHistory(params),
		placeholderData: keepPreviousData,
	});

export type ReviewBorrowRequest = {
	id: string;
	reviewedBy: string;
	remarks?: string;
	status: BorrowRequestStatus;
};

export type ReviewBorrowResponse = {
	id: string;
	reviewedBy: UserBasicInfo;
	remarks?: string;
	status: BorrowRequestStatusDetail;
};

type GetBorrowedItemParams = {
	userId?: string;
	sort?: Sort;
	category?: string;
};

async function getBorrowedItems(
	params: GetBorrowedItemParams,
): Promise<BorrowRequestItem[]> {
	const url = new URL(`${BACKEND_URL}/users/${params.userId}/borrowed-equipments`);

	if (params.sort) {
		url.searchParams.append("sort", params.sort);
	}
	if (params.category) {
		url.searchParams.append("category", params.category);
	}

	const response = await fetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<BorrowRequestItem[]> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result.data;
}

export const borrowedItemsQuery = (params: GetBorrowedItemParams) =>
	queryOptions({
		queryKey: ["borrowed-items", params],
		queryFn: () => getBorrowedItems(params),
	});

export type UpdateBorrowRequest = {
	id: string;
	status: BorrowRequestStatus;
};

export type UpdateBorrowResponse = {
	id: string;
	status: BorrowRequestStatusDetail;
};

export async function updateBorrowRequest(
	value: UpdateBorrowRequest,
): Promise<ApiResponse<UpdateBorrowRequest>> {
	const response = await fetch(`${BACKEND_URL}/borrow-requests/${value.id}`, {
		method: "PATCH",
		body: JSON.stringify(value),
		headers: {
			"Content-Type": "application/json",
		},
	});

	const result: ApiResponse<UpdateBorrowRequest> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result;
}
