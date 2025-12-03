import { queryOptions } from "@tanstack/react-query";
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

export const equipmentStatuses: EquipmentStatusDetail[] = [
	{
		id: 1,
		code: EquipmentStatus.Available,
		label: "Available",
	},
	{
		id: 2,
		code: EquipmentStatus.Reserved,
		label: "Reserved",
	},
	{
		id: 3,
		code: EquipmentStatus.Borrowed,
		label: "Borrowed",
	},
	{
		id: 4,
		code: EquipmentStatus.Damaged,
		label: "Damaged",
	},
	{
		id: 5,
		code: EquipmentStatus.Lost,
		label: "Lost",
	},
	{
		id: 6,
		code: EquipmentStatus.Maintenance,
		label: "Maintenance",
	},
	{
		id: 7,
		code: EquipmentStatus.Disposed,
		label: "Disposed",
	},
];

export type EquipmentStatusDetail = {
	id: number;
	code: EquipmentStatus;
	label: string;
};

export type EquipmentStatusQuantity = {
	quantity: number;
	status: EquipmentStatusDetail;
};

export type EquipmentType = {
	id: string;
	name: string;
	brand?: string;
	model?: string;
	imageUrl?: string;
	statusQuantity: EquipmentStatusQuantity[];
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
	});

type EquipmentBorrower = {
	quantity: number;
	borrower: Borrower;
	expectedReturnAt: string;
};

export type EquipmentWithBorrower = {
	id: string;
	name: string;
	brand?: string;
	model?: string;
	imageUrl?: string;
	quantity: number;
	borrowers: EquipmentBorrower[];
};
