import type { RegisterData } from "@/routes/_auth/_register/-context";
import type { User } from ".";
import { BACKEND_URL, type ApiResponse } from "../api";
import type { RegisterUser } from "./model";

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
		const response = await fetch(`${BACKEND_URL}/sessions?token=${token}`);

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

    const response = await fetch(`${BACKEND_URL}/register`, {
        method: "POST",
        body: formData,
    });

    const result: ApiResponse = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Register failed");
    }

    return result;
}

