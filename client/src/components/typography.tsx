import { cn } from "@/lib/utils";
import type { JSX, ReactNode } from "react";

type Props = {
	children: ReactNode;
	className?: string;
};

export function H1(props: Props): JSX.Element {
	return (
		<h1
			className={cn(
				"font-montserrat-bold text-4xl tracking-tight leading-10",
				props.className,
			)}
		>
			{props.children}
		</h1>
	);
}

export function H2(props: Props): JSX.Element {
	return (
		<h2
			className={cn(
				"font-montserrat-semibold text-2xl tracking-tight leading-8",
				props.className,
			)}
		>
			{props.children}
		</h2>
	);
}

export function P(props: Props): JSX.Element {
	return (
		<p className={cn("font-open-sans text-base leading-6", props.className)}>
			{props.children}
		</p>
	);
}

export function Caption(props: Props): JSX.Element {
	return (
		<p className={cn("font-open-sans text-xs leading-4", props.className)}>
			{props.children}
		</p>
	);
}

export function LabelMedium(props: Props): JSX.Element {
	return (
		<span
			className={cn(
				"font-montserrat-semibold text-xs leading-4",
				props.className,
			)}
		>
			{props.children}
		</span>
	);
}

export function LabelSmall(props: Props): JSX.Element {
	return (
		<p
			className={cn(
				"font-montserrat-medium text-[0.7rem] leading-4",
				props.className,
			)}
		>
			{props.children}
		</p>
	);
}

export function TitleSmall(props: Props): JSX.Element {
	return (
		<p
			className={cn(
				"font-montserrat-medium text-sm leading-5",
				props.className,
			)}
		>
			{props.children}
		</p>
	);
}
