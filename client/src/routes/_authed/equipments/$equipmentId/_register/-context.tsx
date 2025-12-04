import {
	createContext,
	type JSX,
	type ReactNode,
	useContext,
	useState,
	type SetStateAction,
	type Dispatch,
} from "react";
import type { RegisterEquipmentNameSchema } from "./register/name";
import type { RegisterEquipmentQuantitySchema } from "./register/quantity";
import type { RegisterEquipmentImageSchema } from "./register/image";

export type RegisterEquipmentData = RegisterEquipmentNameSchema &
	RegisterEquipmentQuantitySchema &
	RegisterEquipmentImageSchema;

export type RegisterEquipmentContextValue = {
	value: RegisterEquipmentData;
	setValue: Dispatch<SetStateAction<RegisterEquipmentData>>;
};

const RegisterEquipmentContext =
	createContext<RegisterEquipmentContextValue | null>(null);

type RegisterEquipmentProviderProps = {
	children: ReactNode;
};

export function RegisterEquipmentProvider(
	props: RegisterEquipmentProviderProps,
): JSX.Element {
	const [value, setValue] = useState<RegisterEquipmentData>({
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
