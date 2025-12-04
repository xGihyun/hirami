import { queryOptions } from "@tanstack/react-query";
import type { Equipment } from ".";
import { BACKEND_URL, Sort, type ApiResponse } from "../api";
import type { UserBasicInfo } from "../user";
import type { OTP } from "./borrow";

type GetReturnRequestParams = {
	userId?: string;
	sort?: Sort;
	category?: string;
};

export type ReturnRequest = {
	id: string;
	createdAt: string;
	borrower: UserBasicInfo;
	equipments: Equipment[];
	expectedReturnAt: string;
	otp: OTP;
};

async function getReturnRequests(
	params: GetReturnRequestParams,
): Promise<ReturnRequest[]> {
	const url = new URL(`${BACKEND_URL}/return-requests`);

	if (params.userId) {
		url.searchParams.append("userId", params.userId);
	}
	if (params.sort) {
		url.searchParams.append("sort", params.sort);
	}
	if (params.category) {
		url.searchParams.append("category", params.category);
	}
	console.log(url.toString());
	const response = await fetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<ReturnRequest[]> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result.data;
}

export const returnRequestsQuery = (params: GetReturnRequestParams) =>
	queryOptions({
		queryKey: ["return-requests", params],
		queryFn: () => getReturnRequests(params),
	});

async function getReturnRequestById(id: string): Promise<ReturnRequest> {
	const url = new URL(`${BACKEND_URL}/return-requests/${id}`);
	const response = await fetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<ReturnRequest> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result.data;
}

export const returnRequestByIdQuery = (id: string) =>
	queryOptions({
		queryKey: ["return-requests", id],
		queryFn: () => getReturnRequestById(id),
	});

async function getReturnRequestByOtp(otp: string): Promise<ReturnRequest> {
	const url = new URL(`${BACKEND_URL}/return-requests/otp/${otp}`);
	const response = await fetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<ReturnRequest> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result.data;
}

export const returnRequestByOtpQuery = (otp: string) =>
	queryOptions({
		queryKey: ["return-requests", otp],
		queryFn: () => getReturnRequestByOtp(otp),
	});

export type ConfirmReturnRequest = {
	returnRequestId: string;
	reviewedBy: string;
	remarks?: string;
};

export async function confirmReturnRequest(
	value: ConfirmReturnRequest,
): Promise<ApiResponse> {
	const response = await fetch(
		`${BACKEND_URL}/return-requests/${value.returnRequestId}`,
		{
			method: "PATCH",
			body: JSON.stringify(value),
			headers: { "Content-Type": "application/json" },
		},
	);
	const result: ApiResponse = await response.json();
	if (!response.ok) throw new Error(result.message);
	return result;
}
