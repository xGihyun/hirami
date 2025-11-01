import {
	createContext,
	type JSX,
	type ReactNode,
	useContext,
	useState,
	type SetStateAction,
	type Dispatch,
} from "react";
import type { RegisterPasswordSchema } from "./register/password";
import type { RegisterEmailSchema } from "./register/email";
import type { RegisterPersonalSchema } from "./register/personal";

export type RegisterData = RegisterEmailSchema &
	RegisterPasswordSchema &
	RegisterPersonalSchema;

export type RegisterContextValue = {
	value: RegisterData;
	setValue: Dispatch<SetStateAction<RegisterData>>;
};

const RegisterContext = createContext<RegisterContextValue | null>(null);

type RegisterProviderProps = {
	children: ReactNode;
};

export function RegisterProvider(props: RegisterProviderProps): JSX.Element {
	const [value, setValue] = useState<RegisterData>({
		email: "",
		password: "",
		confirmPassword: "",
		middleName: "",
		firstName: "",
		lastName: "",
	});

	return (
		<RegisterContext value={{ value, setValue }}>
			{props.children}
		</RegisterContext>
	);
}

export function useRegister(): RegisterContextValue {
	const context = useContext(RegisterContext);
	if (!context) {
		throw new Error("useRegister must be used within an RegisterProvider");
	}

	return context;
}
