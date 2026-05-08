import { BACKEND_URL, type ApiResponse } from "@/lib/api";
import z from "zod";

const borrowEquipmentItemSchema = z.object({
	equipmentTypeId: z.string().nonempty(),
	quantity: z.number().positive(),
});

export const createBorrowRequestSchema = z.object({
	equipments: z.array(borrowEquipmentItemSchema),
	location: z.string().nonempty(),
	purpose: z.string().nonempty(),
	expectedReturnAt: z.date(),
	requestedBy: z.string().nonempty(),
	agreedToPolicy: z.boolean().refine((v) => v === true, {
		message: "You must agree to the borrowing policy",
	}),
});

export type CreateBorrowRequest = z.infer<typeof createBorrowRequestSchema>;

export async function createBorrowRequest(value: CreateBorrowRequest): Promise<ApiResponse> {
	const response = await fetch(`${BACKEND_URL}/borrow-requests`, {
		method: "POST",
		body: JSON.stringify(value),
		headers: {
			"Content-Type": "application/json",
		},
	});

	const result: ApiResponse = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result;
}
