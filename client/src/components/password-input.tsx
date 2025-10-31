import { useId, useState, type JSX } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordInput({
	className,
	type,
	...props
}: React.ComponentProps<"input">): JSX.Element {
	const id = useId();
	const [isVisible, setIsVisible] = useState<boolean>(false);

	const toggleVisibility = () => setIsVisible((prevState) => !prevState);

	return (
		<div className="*:not-first:mt-2">
			<div className="relative">
				<Input
					id={id}
					className={cn("pe-9", className)}
					placeholder="Password"
					type={isVisible ? "text" : "password"}
					{...props}
				/>

				<button
					className="absolute inset-y-0 end-2 cursor-pointer flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 transition-[color,box-shadow] outline-none hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
					type="button"
					onClick={toggleVisibility}
					aria-label={isVisible ? "Hide password" : "Show password"}
					aria-pressed={isVisible}
					aria-controls="password"
				>
					{isVisible ? (
						<EyeOffIcon size={24} aria-hidden="true" />
					) : (
						<EyeIcon size={24} aria-hidden="true" />
					)}
				</button>
			</div>
		</div>
	);
}
