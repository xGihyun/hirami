import { protectedFetch } from "../api";
import { queryOptions } from "@tanstack/react-query";
import { BACKEND_URL, Sort, type ApiResponse } from "../api";
import {
	borrowRequestItemSchema,
	borrowRequestSchema,
	equipmentWithBorrowerSchema,
	equipmentInventoryStatusSchema,
	returnRequestSchema,
	updateBorrowResponseSchema,
	type BorrowRequest,
	type BorrowRequestItem,
	type BorrowRequestStatus,
	type EquipmentWithBorrower,
	type EquipmentInventoryStatus,
	type ReturnRequest,
	type ReviewBorrowRequest,
	type ReviewBorrowResponse,
	type UpdateBorrowRequest,
	type UpdateBorrowResponse,
	categorySchema,
	type Category,
} from "./model";
import z from "zod";
import type { RegisterEquipmentSchema } from "@/routes/_authed/equipments/$equipmentId/_register/register/-schema";
import { ErrExistingEquipment } from "./error";

//
// Equipment
//

type GetEquipmentParams = {
	names: string[];
	search?: string;
};

async function getEquipments(
	params: GetEquipmentParams,
): Promise<EquipmentWithBorrower[]> {
	const url = new URL(`${BACKEND_URL}/equipments`);
	if (params.names && params.names.length > 0) {
		url.searchParams.append("name", params.names.join(","));
	}
	if (params.search) {
		url.searchParams.append("search", params.search);
	}

	const response = await protectedFetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<EquipmentWithBorrower[]> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return equipmentWithBorrowerSchema.array().parse(result.data);
}

export const equipmentsQuery = (params: GetEquipmentParams) =>
	queryOptions({
		queryKey: ["equipments", params],
		queryFn: () => getEquipments(params),
	});

async function getEquipmentById(
	id: string,
): Promise<EquipmentWithBorrower | null> {
	const url = new URL(`${BACKEND_URL}/equipments/${id}`);
	const response = await protectedFetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<EquipmentInventoryStatus | null> =
		await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return equipmentWithBorrowerSchema.nullable().parse(result.data);
}

export const getEquipmentByIdQuery = (id: string) =>
	queryOptions({
		queryKey: ["equipments", id],
		queryFn: () => getEquipmentById(id),
	});

async function getEquipmentInventoryStatus(
	id: string,
): Promise<EquipmentInventoryStatus> {
	const url = new URL(`${BACKEND_URL}/equipments/${id}/status`);
	const response = await protectedFetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<EquipmentInventoryStatus> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return equipmentInventoryStatusSchema.parse(result.data);
}

export const getEquipmentInventoryStatusQuery = (id: string) =>
	queryOptions({
		queryKey: ["equipments", "status", id],
		queryFn: () => getEquipmentInventoryStatus(id),
	});

async function getEquipmentNames(): Promise<string[]> {
	const url = new URL(`${BACKEND_URL}/equipment-names`);
	const response = await protectedFetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<string[]> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return z.string().array().parse(result.data);
}

export const equipmentNamesQuery = () =>
	queryOptions({
		queryKey: ["equipment-names"],
		queryFn: () => getEquipmentNames(),
	});

async function getCategories(): Promise<Category[]> {
	const url = new URL(`${BACKEND_URL}/categories`);
	const response = await protectedFetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<Category[]> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return categorySchema.array().parse(result.data);
}

export const categoriesQuery = queryOptions({
	queryKey: ["categories"],
	queryFn: getCategories,
});

export async function createCategory(value: {
	name: string;
	backgroundColor?: string;
	foregroundColor?: string;
}): Promise<ApiResponse<Category>> {
	const response = await protectedFetch(`${BACKEND_URL}/categories`, {
		method: "POST",
		body: JSON.stringify(value),
		headers: {
			"Content-Type": "application/json",
		},
	});

	const result: ApiResponse<Category> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result;
}

export async function updateCategory(value: {
	id: string;
	name: string;
	backgroundColor?: string;
	foregroundColor?: string;
}): Promise<ApiResponse<Category>> {
	const response = await protectedFetch(`${BACKEND_URL}/categories/${value.id}`, {
		method: "PATCH",
		body: JSON.stringify(value),
		headers: {
			"Content-Type": "application/json",
		},
	});

	const result: ApiResponse<Category> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result;
}

export async function deleteCategory(id: string): Promise<ApiResponse> {
	const response = await protectedFetch(`${BACKEND_URL}/categories/${id}`, {
		method: "DELETE",
	});

	const result: ApiResponse = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result;
}

export async function deleteEquipment(
	id: string,
	quantity?: number,
): Promise<ApiResponse> {
	const url = new URL(`${BACKEND_URL}/equipments/${id}`);
	if (quantity !== undefined) {
		url.searchParams.append("quantity", quantity.toString());
	}
	const response = await protectedFetch(url, {
		method: "DELETE",
	});

	return response.json();
}

//
// Borrow Request
//

async function getBorrowRequests(): Promise<BorrowRequest[]> {
	const response = await protectedFetch(`${BACKEND_URL}/borrow-requests`, {
		method: "GET",
	});

	const result: ApiResponse<BorrowRequest[]> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return borrowRequestSchema.array().parse(result.data);
}

export const getBorrowRequestsQuery = queryOptions({
	queryKey: ["borrow-requests"],
	queryFn: getBorrowRequests,
});

async function getBorrowRequestById(id: string): Promise<BorrowRequest> {
	const response = await protectedFetch(`${BACKEND_URL}/borrow-requests/${id}`, {
		method: "GET",
	});

	const result: ApiResponse<BorrowRequest> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return borrowRequestSchema.parse(result.data);
}

export const borrowRequestByIdQuery = (id: string) =>
	queryOptions({
		queryKey: ["borrow-requests", id],
		queryFn: () => getBorrowRequestById(id),
	});

async function getBorrowRequestByOtp(otp: string): Promise<BorrowRequest> {
	const response = await protectedFetch(`${BACKEND_URL}/borrow-requests/otp/${otp}`, {
		method: "GET",
	});

	const result: ApiResponse<BorrowRequest> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return borrowRequestSchema.parse(result.data);
}

export const borrowRequestByOtpQuery = (otp: string) =>
	queryOptions({
		queryKey: ["borrow-requests", otp],
		queryFn: () => getBorrowRequestByOtp(otp),
	});

type GetBorrowHistoryParams = {
	userId?: string;
	status?: BorrowRequestStatus;
	sort?: Sort;
	sortBy?: string;
	category?: string;
	search?: string;
	startDate?: string;
	endDate?: string;
	equipmentIds?: string;
};

async function getBorrowHistory(
	params: GetBorrowHistoryParams,
): Promise<BorrowRequest[]> {
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
	if (params.startDate) {
		url.searchParams.append("startDate", params.startDate);
	}
	if (params.endDate) {
		url.searchParams.append("endDate", params.endDate);
	}
	if (params.equipmentIds) {
		url.searchParams.append("equipmentIds", params.equipmentIds);
	}

	const response = await protectedFetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<BorrowRequest[]> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return borrowRequestSchema.array().parse(result.data);
}

export const borrowHistoryQuery = (params: GetBorrowHistoryParams) =>
	queryOptions({
		queryKey: ["borrow-history", params],
		queryFn: () => getBorrowHistory(params),
	});

type GetBorrowedItemParams = {
	userId?: string;
	sort?: Sort;
	category?: string;
};

async function getBorrowedItems(
	params: GetBorrowedItemParams,
): Promise<BorrowRequestItem[]> {
	const url = new URL(
		`${BACKEND_URL}/users/${params.userId}/borrowed-equipments`,
	);

	if (params.sort) {
		url.searchParams.append("sort", params.sort);
	}
	if (params.category) {
		url.searchParams.append("category", params.category);
	}

	const response = await protectedFetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<BorrowRequestItem[]> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return borrowRequestItemSchema.array().parse(result.data);
}

export const getBorrowedItemsQuery = (params: GetBorrowedItemParams) =>
	queryOptions({
		queryKey: ["borrowed-items", params],
		queryFn: () => getBorrowedItems(params),
	});

export async function updateBorrowRequest(
	value: UpdateBorrowRequest,
): Promise<ApiResponse<UpdateBorrowResponse>> {
	const response = await protectedFetch(`${BACKEND_URL}/borrow-requests/${value.id}`, {
		method: "PATCH",
		body: JSON.stringify(value),
		headers: {
			"Content-Type": "application/json",
		},
	});

	const result: ApiResponse<UpdateBorrowResponse> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	updateBorrowResponseSchema.parse(result.data);

	return result;
}

export async function reviewBorrowRequest(
	value: ReviewBorrowRequest,
): Promise<ApiResponse<ReviewBorrowResponse>> {
	const response = await protectedFetch(`${BACKEND_URL}/review-borrow-requests`, {
		method: "PATCH",
		body: JSON.stringify(value),
		headers: {
			"Content-Type": "application/json",
		},
	});

	const result: ApiResponse<ReviewBorrowResponse> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result;
}

//
// Return Request
//

type GetReturnRequestParams = {
	userId?: string;
	sort?: Sort;
	category?: string;
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

	const response = await protectedFetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<ReturnRequest[]> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return returnRequestSchema.array().parse(result.data);
}

export const returnRequestsQuery = (params: GetReturnRequestParams) =>
	queryOptions({
		queryKey: ["return-requests", params],
		queryFn: () => getReturnRequests(params),
	});

async function getReturnRequestById(id: string): Promise<ReturnRequest> {
	const url = new URL(`${BACKEND_URL}/return-requests/${id}`);
	const response = await protectedFetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<ReturnRequest> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return returnRequestSchema.parse(result.data);
}

export const returnRequestByIdQuery = (id: string) =>
	queryOptions({
		queryKey: ["return-requests", id],
		queryFn: () => getReturnRequestById(id),
	});

async function getReturnRequestByOtp(otp: string): Promise<ReturnRequest> {
	const url = new URL(`${BACKEND_URL}/return-requests/otp/${otp}`);
	const response = await protectedFetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<ReturnRequest> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return returnRequestSchema.parse(result.data);
}

export const returnRequestByOtpQuery = (otp: string) =>
	queryOptions({
		queryKey: ["return-requests", otp],
		queryFn: () => getReturnRequestByOtp(otp),
	});

type ConfirmReturnRequest = {
	returnRequestId: string;
	reviewedBy: string;
	remarks?: string;
};

export async function confirmReturnRequest(
	value: ConfirmReturnRequest,
): Promise<ApiResponse> {
	const response = await protectedFetch(
		`${BACKEND_URL}/return-requests/${value.returnRequestId}`,
		{
			method: "PATCH",
			body: JSON.stringify(value),
			headers: { "Content-Type": "application/json" },
		},
	);
	const result: ApiResponse = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result;
}

export async function registerEquipment(
	value: RegisterEquipmentSchema,
): Promise<ApiResponse> {
	const formData = new FormData();
	formData.append("name", value.name);
	if (value.brand) formData.append("brand", value.brand);
	if (value.model) formData.append("model", value.model);
	formData.append("acquisitionDate", value.acquisitionDate.toISOString());
	formData.append("quantity", value.quantity.toString());
	if (value.image) formData.append("image", value.image);
	if (value.categoryIds && value.categoryIds.length > 0) {
		formData.append("categoryIds", value.categoryIds.join(","));
	}

	const response = await protectedFetch(`${BACKEND_URL}/equipments`, {
		method: "POST",
		body: formData,
	});

	const result: ApiResponse = await response.json();
	if (!response.ok) {
		if (response.status === 409) {
			throw new ErrExistingEquipment(result.message);
		}

		throw new Error(result.message);
	}

	return result;
}
