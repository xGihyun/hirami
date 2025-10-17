import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { BACKEND_URL, type ApiResponse } from "../api";
import type { Borrower } from "./borrow";
// import { fetch } from '@tauri-apps/plugin-http';

export enum EquipmentStatus {
	Available = "available",
	Borrowed = "borrowed",
}

export type Equipment = {
	id: string;
	name: string;
	brand?: string;
	model?: string;
	imageUrl?: string;
	quantity: number;
	status: EquipmentStatus;
	borrower?: Borrower;
};

async function getEquipments(names?: string[]): Promise<Equipment[]> {
	const url = new URL(`${BACKEND_URL}/equipments`);
	if (names && names.length > 0) {
		url.searchParams.append("name", names.join(","));
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

export const equipmentsQuery = (names: string[] = []) =>
	queryOptions({
		queryKey: ["equipments", ...names],
		queryFn: () => getEquipments(names),
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
