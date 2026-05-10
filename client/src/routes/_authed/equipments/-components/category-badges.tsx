import { useState, useRef, useEffect, type JSX } from "react";
import { Badge } from "@/components/ui/badge";
import type { Category } from "@/lib/equipment/model";
import { cn } from "@/lib/utils";

type Props = {
	categories: Category[];
};

export function CategoryBadges({ categories }: Props): JSX.Element {
	const [visibleCount, setVisibleCount] = useState(categories.length);
	const [isCalculated, setIsCalculated] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const checkOverflow = () => {
			const badges = Array.from(container.children) as HTMLElement[];
			if (badges.length === 0) {
				setIsCalculated(true);
				return;
			}

			let count = 0;
			const containerWidth = container.offsetWidth;
			let currentWidth = 0;
			const gap = 4; // gap-1 is 0.25rem = 4px

			const moreBadgeWidth = 45; // slightly larger to be safe

			for (let i = 0; i < badges.length; i++) {
				const badgeWidth = badges[i].offsetWidth;
				
				if (currentWidth + badgeWidth <= containerWidth) {
					currentWidth += badgeWidth + gap;
					count++;
				} else {
					while (count > 0 && currentWidth + moreBadgeWidth > containerWidth) {
						count--;
						const prevBadgeWidth = badges[count].offsetWidth;
						currentWidth -= (prevBadgeWidth + gap);
					}
					break;
				}
			}
			
			setVisibleCount(count);
			setIsCalculated(true);
		};

		const resizeObserver = new ResizeObserver(checkOverflow);
		resizeObserver.observe(container);
		
		// Initial check
		checkOverflow();

		return () => resizeObserver.disconnect();
	}, [categories]);

	if (!categories || categories.length === 0) return <div className="h-5" />;

	const moreCount = categories.length - visibleCount;

	return (
		<div 
			className={cn(
				"flex gap-1 mt-1 overflow-hidden h-5 relative transition-opacity duration-200",
				!isCalculated ? "opacity-0" : "opacity-100"
			)} 
			ref={containerRef}
		>
			{categories.map((cat, index) => (
				<Badge
					key={cat.id}
					variant="secondary"
					className={cn(
						"text-[0.65rem] px-1 py-0 h-4 flex-shrink-0 whitespace-nowrap",
						index >= visibleCount ? "invisible absolute" : ""
					)}
					style={{
						backgroundColor: cat.backgroundColor || undefined,
						color: cat.foregroundColor || undefined,
					}}
				>
					{cat.name}
				</Badge>
			))}
			{moreCount > 0 && (
				<Badge
					variant="secondary"
					className="text-[0.65rem] px-1 py-0 h-4 flex-shrink-0 whitespace-nowrap"
				>
					+{moreCount} more
				</Badge>
			)}
		</div>
	);
}
