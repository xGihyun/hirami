import {
	createContext,
	type JSX,
	type ReactNode,
	useContext,
	useState,
	useEffect,
} from "react";
import { type User } from "./lib/user";
import { type AuthSession, getAuthSession } from "./lib/user/auth";
import { deleteCookie, getCookie } from "./lib/cookie";

export type AuthContextValue = {
	user: User | null;
	sessionToken: string;
	validateSession: () => Promise<AuthSession | null>;
	signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
	children: ReactNode;
};

export function AuthProvider(props: AuthProviderProps): JSX.Element {
	const [user, setUser] = useState<User | null>(null);
	const [sessionToken, setSessionToken] = useState<string>("");

	async function validateSession(): Promise<AuthSession | null> {
		const token = getCookie("session");
		if (!token) {
			return null;
		}

		const authSession = await getAuthSession(token);
		if (authSession.data === null) {
			setUser(null);
			return null;
		}
		setUser(authSession.data.user);
		setSessionToken(token);

		return authSession.data;
	}

	async function signOut(): Promise<void> {
		const token = getCookie("session");
		if (!token || !user) {
			return;
		}

		await fetch(`${import.meta.env.VITE_BACKEND_URL}/logout`, {
			method: "POST",
			body: JSON.stringify({
				token,
				userId: user.id,
			}),
			headers: {
				"Content-Type": "application/json",
			},
		});

		setUser(null);
		deleteCookie("session");
	}

	useEffect(() => {
		validateSession();
	}, []);

	return (
		<AuthContext value={{ user, validateSession, signOut, sessionToken }}>
			{props.children}
		</AuthContext>
	);
}

export function useAuth(): AuthContextValue {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}

	return context;
}
