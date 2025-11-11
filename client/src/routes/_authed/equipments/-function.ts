import { BACKEND_URL, type ApiResponse } from "@/lib/api";
import z from "zod";

const borrowEquipmentItemSchema = z.object({
	equipmentTypeId: z.string().nonempty(),
	quantity: z.number().positive(),
});

export const borrowRequestSchema = z.object({
	equipments: z.array(borrowEquipmentItemSchema),
	location: z
		.string()
		.nonempty({ error: "This field must not be left blank." }),
	purpose: z.string().nonempty({ error: "This field must not be left blank." }),
	expectedReturnAt: z.date(),
	requestedBy: z
		.string()
		.nonempty({ error: "This field must not be left blank." }),
});

export type BorrowRequestSchema = z.infer<typeof borrowRequestSchema>;

export async function borrow(value: BorrowRequestSchema): Promise<ApiResponse> {
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
