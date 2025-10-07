import { queryOptions } from "@tanstack/react-query";
import { BACKEND_URL, type ApiResponse } from "../api";
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

type Borrower = {
	id: string;
	firstName: string;
	middleName?: string;
	lastName: string;
	avatarUrl?: string;
};

async function getEquipments(): Promise<Equipment[]> {
	const response = await fetch(
		`${BACKEND_URL}/equipments`,
		{
			method: "GET",
		},
	);

	const result: ApiResponse<Equipment[]> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result.data;
}

export const equipmentsQuery = queryOptions({
	queryKey: ["equipments"],
	queryFn: getEquipments,
});
