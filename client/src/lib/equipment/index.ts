import { queryOptions } from "@tanstack/react-query";
import type { ApiResponse } from "../api";

export enum EquipmentStatus {
	Available = "available",
	Borrowed = "borrowed",
}

export type Equipment = {
	id: string;
	name: string;
	brand?: string;
	model?: string;
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

async function getEquipments(): Promise<ApiResponse<Equipment[]>> {
	const response = await fetch(
		`${import.meta.env.VITE_BACKEND_URL}/equipments`,
		{
			method: "GET",
		},
	);

	const result: ApiResponse<Equipment[]> = await response.json();

	return result;
}

export const equipmentsQuery = queryOptions({
	queryKey: ["equipments"],
	queryFn: getEquipments,
});
