import { useAuth } from "@/auth";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getNavOptions } from "@/lib/constant";
import { Link, linkOptions } from "@tanstack/react-router";
import { LabelLarge, TitleSmall } from "./typography";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { IconChevronArrowDownUp } from "@/lib/icons";
import { HiramiLogoDark } from "@/lib/assets/logo-dark";
import type { JSX } from "react";
import { toImageUrl } from "@/lib/api";

export function AppSidebar(): JSX.Element {
	const auth = useAuth();
	const navOptions = linkOptions(getNavOptions(auth.user?.role.code));

	return (
		<Sidebar className="w-72">
			<SidebarHeader className="items-center">
				<HiramiLogoDark className="h-8 w-fit" />
				<LabelLarge>Hirami</LabelLarge>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarMenu>
						{navOptions.map((opt) => {
							const Icon = opt.icon;
							return (
								<SidebarMenuItem key={opt.label}>
									<SidebarMenuButton
										asChild
										className="data-[status=active]:bg-primary data-[status=active]:text-primary-foreground h-fit"
									>
										<Link key={opt.label} to={opt.to}>
											<span>
												<Icon className="size-6" />
											</span>
											<TitleSmall>{opt.label}</TitleSmall>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							);
						})}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton className="h-fit items-center flex">
							<Avatar className="size-8 bg-gradient-to-b from-accent to-muted rounded-md">
								<AvatarImage
									src={toImageUrl(auth.user?.avatarUrl)}
									className="object-cover rounded-md"
								/>
								<AvatarFallback className="rounded-md" />
							</Avatar>

							<TitleSmall className="font-montserrat-semibold">
								{auth.user?.firstName} {auth.user?.lastName}
							</TitleSmall>

							<IconChevronArrowDownUp className="ml-auto" />
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
