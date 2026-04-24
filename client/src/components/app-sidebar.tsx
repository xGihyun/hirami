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
import { Link, linkOptions, useNavigate } from "@tanstack/react-router";
import { LabelLarge, TitleSmall } from "./typography";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { IconChevronArrowDownUp, IconLogOut, IconProfile } from "@/lib/icons";
import { HiramiLogoDark } from "@/lib/assets/logo-dark";
import type { JSX } from "react";
import { toImageUrl } from "@/lib/api";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function AppSidebar(): JSX.Element {
	const auth = useAuth();
	const navOptions = linkOptions(getNavOptions(auth.user?.role.code));

	const navigate = useNavigate();
	async function handleLogout(): Promise<void> {
		await auth.logout();
		await navigate({ to: "/onboarding" });
	}

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
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
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
							</DropdownMenuTrigger>
							<DropdownMenuContent side="top" align="start" className="w-56">
								<DropdownMenuItem asChild>
									<Link to="/profile" className="flex items-center gap-2">
										<IconProfile className="size-4" />
										<TitleSmall>Profile</TitleSmall>
									</Link>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={handleLogout}
									className="flex items-center gap-2 text-destructive"
								>
									<IconLogOut className="size-4 text-destructive focus:text-destructive" />
									<TitleSmall>Logout</TitleSmall>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
