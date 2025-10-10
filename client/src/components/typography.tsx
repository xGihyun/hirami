import type { JSX } from "react";

type Props = {
	children: string;
};

export function H1(props: Props): JSX.Element {
	return (
		<h1 className="font-montserrat-bold text-4xl tracking-tight leading-10">
			{props.children}
		</h1>
	);
}

export function H2(props: Props): JSX.Element {
	return (
		<h2 className="font-montserrat-semibold text-2xl tracking-tight leading-8">
			{props.children}
		</h2>
	);
}

export function P(props: Props): JSX.Element {
	return (
		<h2 className="font-open-sans text-base leading-6">{props.children}</h2>
	);
}

export function Caption(props: Props): JSX.Element {
	return <h2 className="font-open-sans text-xs leading-4">{props.children}</h2>;
}
