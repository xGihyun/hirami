import type { User } from ".";
import { BACKEND_URL, type ApiResponse } from "../api";
// import { fetch } from '@tauri-apps/plugin-http';

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
		`${BACKEND_URL}/sessions?token=${token}`,
	);

	const result: ApiResponse<AuthSession> = await response.json();

	return result;
}
