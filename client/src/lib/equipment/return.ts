import { queryOptions } from "@tanstack/react-query";
import type { Equipment } from ".";
import { BACKEND_URL, type ApiResponse } from "../api";
import type { UserBasicInfo } from "../user";

type GetReturnRequestParams = {
	userId?: string;
};

export type ReturnRequest = {
	id: string;
	createdAt: string;
	borrower: UserBasicInfo;
	equipments: Equipment[];
	expectedReturnAt: string;
};

async function getReturnRequests(
	params: GetReturnRequestParams,
): Promise<ReturnRequest[]> {
	const url = new URL(`${BACKEND_URL}/return-requests`);
	if (params.userId) {
		url.searchParams.append("userId", params.userId);
	}
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
		queryKey: ["return-requests", params.userId],
		queryFn: () => getReturnRequests(params),
	});

export type ConfirmReturnRequest = {
	returnRequestId: string;
	reviewedBy: string;
};
