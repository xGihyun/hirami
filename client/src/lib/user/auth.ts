import type { User } from ".";
import { BACKEND_URL, type ApiResponse } from "../api";

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
