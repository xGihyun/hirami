import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { BACKEND_URL, type ApiResponse } from "../api";
import type { Borrower } from "./borrow";

export const DEFAULT_EQUIPMENT_IMAGE =
	"https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

export enum EquipmentStatus {
	Available = "available",
	Reserved = "reserved",
	Borrowed = "borrowed",
	Damaged = "damaged",
	Lost = "lost",
	Maintenance = "maintenance",
	Disposed = "disposed",
}

export type EquipmentStatusDetail = {
	id: number;
	code: EquipmentStatus;
	label: string;
};

export type EquipmentType = {
	id: string;
	name: string;
	brand?: string;
	model?: string;
	imageUrl?: string;
};

export type Equipment = {
	id: string;
	name: string;
	brand?: string;
	model?: string;
	imageUrl?: string;
	quantity: number;
	status: EquipmentStatusDetail;
	borrower?: Borrower;
};

async function getEquipments(params: GetEquipmentParams): Promise<Equipment[]> {
	const url = new URL(`${BACKEND_URL}/equipments`);
	if (params.names && params.names.length > 0) {
		url.searchParams.append("name", params.names.join(","));
	}
	if (params.search) {
		url.searchParams.append("search", params.search);
	}

	const response = await fetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<Equipment[]> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result.data;
}

type GetEquipmentParams = {
	names: string[];
	search?: string;
};

export const equipmentsQuery = (params: GetEquipmentParams) =>
	queryOptions({
		queryKey: ["equipments", params],
		queryFn: () => getEquipments(params),
		placeholderData: keepPreviousData,
	});

async function getEquipmentType(id: string): Promise<EquipmentType> {
	const url = new URL(`${BACKEND_URL}/equipments/${id}`);
	const response = await fetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<EquipmentType> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result.data;
}

export const equipmentTypeQuery = (id: string) =>
	queryOptions({
		queryKey: ["equipments", id],
		queryFn: () => getEquipmentType(id),
		placeholderData: keepPreviousData,
	});

async function getEquipmentNames(): Promise<string[]> {
	const url = new URL(`${BACKEND_URL}/equipment-names`);
	const response = await fetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<string[]> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result.data;
}

export const equipmentNamesQuery = () =>
	queryOptions({
		queryKey: ["equipment-names"],
		queryFn: () => getEquipmentNames(),
		placeholderData: keepPreviousData,
	});
