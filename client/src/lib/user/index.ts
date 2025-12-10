import { queryOptions } from "@tanstack/react-query";
import {
	BACKEND_URL,
	IMAGE_FORMATS,
	IMAGE_SIZE_LIMIT,
	type ApiResponse,
} from "../api";
import z from "zod";

export enum UserRole {
	Borrower = "borrower",
	EquipmentManager = "equipment_manager",
}

export type UserRoleDetail = {
	id: number;
	code: UserRole;
	label: string;
};

export type User = {
	id: string;
	createdAt: string;
	updatedAt: string;
	email: string;
	firstName: string;
	middleName?: string;
	lastName: string;
	avatarUrl: string;
	role: UserRoleDetail;
};

export type UserBasicInfo = {
	id: string;
	firstName: string;
	middleName?: string;
	lastName: string;
	avatarUrl?: string;
};

type GetUserParams = {
	search?: string;
};

async function getUsers(params?: GetUserParams): Promise<User[]> {
	const url = new URL(`${BACKEND_URL}/users`);
	if (params?.search) {
		url.searchParams.append("search", params.search);
	}

	const response = await fetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<User[]> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result.data;
}

export const usersQuery = (params?: GetUserParams) =>
	queryOptions({
		queryKey: ["users", params],
		queryFn: () => getUsers(params),
	});

async function getUserById(id: string): Promise<User> {
	const url = new URL(`${BACKEND_URL}/users/${id}`);
	const response = await fetch(url.toString(), {
		method: "GET",
	});

	const result: ApiResponse<User> = await response.json();
	if (!response.ok) {
		throw new Error(result.message);
	}

	return result.data;
}

export const userByIdQuery = (id: string) =>
	queryOptions({
		queryKey: ["users", id],
		queryFn: () => getUserById(id),
	});

export const editUserSchema = z.object({
	userId: z.uuidv4(),
	email: z.email().optional(),
	firstName: z
		.string()
		.nonempty(),
	middleName: z.string().optional(),
	lastName: z
		.string()
		.nonempty(),
	role: z.enum(UserRole),
	avatar: z
		.instanceof(File)
		.refine(
			(file) => file.size <= IMAGE_SIZE_LIMIT,
			"Invalid file: Must be PNG or JPG, under 5MB.",
		)
		.refine(
			(file) => IMAGE_FORMATS.includes(file.type),
			"Invalid file: Must be PNG or JPG, under 5MB.",
		)
		.optional(),
});

export type EditUserSchema = z.infer<typeof editUserSchema>;

export async function editUser(
	value: EditUserSchema,
): Promise<ApiResponse<User>> {
	const formData = new FormData();
	formData.append("id", value.userId);
	if (value.email) formData.append("email", value.email);
	if (value.firstName) formData.append("firstName", value.firstName);
	if (value.middleName) formData.append("middleName", value.middleName);
	if (value.lastName) formData.append("lastName", value.lastName);
	if (value.avatar) formData.append("avatar", value.avatar);
	if (value.role) formData.append("role", value.role);

	const response = await fetch(`${BACKEND_URL}/users/${value.userId}`, {
		method: "PATCH",
		body: formData,
	});

	const result: ApiResponse<User> = await response.json();
	if (!response.ok) {
		throw new Error(result.message || "Failed to update profile");
	}

	return result;
}
