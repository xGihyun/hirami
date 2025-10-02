import type { User } from ".";
import type { ApiResponse } from "../api";

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
	const response = await fetch(
		`${import.meta.env.VITE_BACKEND_URL}/sessions?token=${token}`,
	);

	const result: ApiResponse<AuthSession> = await response.json();

	return result;
}
