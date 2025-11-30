import { MinusIcon, PlusIcon } from "lucide-react";
import type { JSX } from "react";
import {
	Button,
	Group,
	Input,
	NumberField,
	type NumberFieldProps,
} from "react-aria-components";

type Props = {
	onChange?: (value: number) => void;
	maxValue?: number;
	className?: string;
} & NumberFieldProps &
	React.RefAttributes<HTMLDivElement>;

export function NumberInput(props: Props): JSX.Element {
	return (
		<NumberField
			defaultValue={1}
			minValue={1}
			{...props}
			aria-label="Number input"
            className="bg-card"
		>
			<Group className="border-input data-focus-within:border-ring data-focus-within:ring-ring/50 data-focus-within:has-aria-invalid:ring-destructive/20 dark:data-focus-within:has-aria-invalid:ring-destructive/40 data-focus-within:has-aria-invalid:border-destructive relative inline-flex h-9 w-full items-center overflow-hidden rounded-md border text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none data-disabled:opacity-50 data-focus-within:ring-[3px]">
				<Button
					slot="decrement"
					className="transition cursor-pointer border-input bg-transparent text-foreground hover:bg-accent hover:text-foreground -ms-px flex aspect-square h-[inherit] items-center justify-center rounded-s-md border text-sm disabled:cursor-not-allowed disabled:text-muted"
				>
					<MinusIcon size={16} aria-hidden="true" />
				</Button>
				<Input className="text-foreground w-full grow px-3 py-2 text-center tabular-nums bg-transparent" />
				<Button
					slot="increment"
					className="transition cursor-pointer border-input bg-transparent text-foreground hover:bg-accent hover:text-foreground -me-px flex aspect-square h-[inherit] items-center justify-center rounded-e-md border text-sm disabled:cursor-not-allowed disabled:text-muted"
				>
					<PlusIcon size={16} aria-hidden="true" />
				</Button>
			</Group>
		</NumberField>
	);
}
