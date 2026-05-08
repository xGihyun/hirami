import {
	createContext,
	type JSX,
	type ReactNode,
	useContext,
	useState,
	type SetStateAction,
	type Dispatch,
} from "react";
import type { RegisterEquipmentSchema } from "./register/-schema";

export type RegisterEquipmentContextValue = {
	value: RegisterEquipmentSchema;
	setValue: Dispatch<SetStateAction<RegisterEquipmentSchema>>;
};

const RegisterEquipmentContext =
	createContext<RegisterEquipmentContextValue | null>(null);

type RegisterEquipmentProviderProps = {
	children: ReactNode;
};

export function RegisterEquipmentProvider(
	props: RegisterEquipmentProviderProps,
): JSX.Element {
	const [value, setValue] = useState<RegisterEquipmentSchema>({
		name: "",
		brand: "",
		model: "",
		quantity: 1,
		acquisitionDate: new Date(),
	});

	return (
		<RegisterEquipmentContext value={{ value, setValue }}>
			{props.children}
		</RegisterEquipmentContext>
	);
}

export function useRegisterEquipment(): RegisterEquipmentContextValue {
	const context = useContext(RegisterEquipmentContext);
	if (!context) {
		throw new Error(
			"useRegisterEquipment must be used within an RegisterEquipmentProvider",
		);
	}

	return context;
}
