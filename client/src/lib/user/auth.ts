import type { User } from ".";
import { BACKEND_URL, protectedFetch, type ApiResponse } from "../api";
import type { RegisterUser } from "./model";
import { ErrExistingAccount } from "./error";

export type Session = {
	sessionId: string;
	userId: string;
	expiresAt: string;
};

export type AuthSession = {
	user: User;
	session: Session;
};

export async function getAuthSession(
	token: string,
): Promise<ApiResponse<AuthSession | null>> {
	let result: ApiResponse<AuthSession | null> = {
		code: 500,
		data: null,
		message: "Failed to get auth session.",
	};

	try {
		const response = await protectedFetch(`${BACKEND_URL}/sessions?token=${token}`);

		result = await response.json();

		return result;
	} catch (error) {
		// console.error(error);
		return result;
	}
}

export async function registerUser(value: RegisterUser): Promise<ApiResponse> {
	const formData = new FormData();
	formData.append("email", value.email);
	formData.append("password", value.password);
	formData.append("firstName", value.firstName);
	if (value.middleName) formData.append("middleName", value.middleName);
	formData.append("lastName", value.lastName);
	if (value.avatar) formData.append("avatar", value.avatar);
	formData.append("role", value.role);

	const response = await protectedFetch(`${BACKEND_URL}/register`, {
		method: "POST",
		body: formData,
	});

	const result: ApiResponse = await response.json();
	if (response.status === 409) {
		throw new ErrExistingAccount(result.message || "Register failed");
	}

	if (!response.ok) {
		throw new Error(result.message || "Register failed");
	}

	return result;
}
