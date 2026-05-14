import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type JSX } from "react";
import { Button } from "@/components/ui/button";
import { DisplayLarge, P, TitleMedium, TitleSmall } from "@/components/typography";
import { HiramiLogoDark } from "@/lib/assets/logo-dark";
import hiramiMobile from "@/lib/assets/hirami-mobile.png";
import { useIsMobile } from "@/hooks/use-mobile";
import IconAndroid from "~icons/material-symbols/android";
import IconGlobe from "~icons/material-symbols/globe";

export const Route = createFileRoute("/landing")({
	component: LandingPage,
});

function LandingPage(): JSX.Element {
	const isMobile = useIsMobile();
	const navigate = useNavigate();

	useEffect(() => {
		if (isMobile) {
			navigate({ to: "/onboarding" });
		}
	}, [isMobile, navigate]);

	if (isMobile) {
		return <></>;
	}

	return (
		<div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 lg:p-24 overflow-hidden">
			<div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
				<div className="space-y-8 animate-in slide-in-from-left duration-700">
					<div className="space-y-4">
						<div className="flex items-center gap-2 mb-8">
							<HiramiLogoDark className="size-10" />
							<TitleMedium className="font-montserrat-bold">Hirami</TitleMedium>
						</div>
						<DisplayLarge className="text-primary text-5xl lg:text-7xl">
							Gear Out, Gear Back - Hassle Free.
						</DisplayLarge>
						<P className="text-muted-foreground text-lg max-w-xl">
							Download the official Hirami Equipment Management System mobile
							app. Access your daily logs, make requests, and track your
							progress right from your Android device.
						</P>
					</div>

					<div className="flex flex-wrap gap-4">
						<Button size="lg" className="rounded-full px-8 h-14" asChild>
							<a href="https://drive.google.com/drive/folders/1JP0CuunnAjMe7jTQ3_rSmxEoo2w8X1sl?usp=sharing" target="_blank" rel="noreferrer">
								<IconAndroid className="size-5 mr-2" />
								DOWNLOAD APK
							</a>
						</Button>
						<Button
							variant="outline"
							size="lg"
							className="rounded-full px-8 h-14"
							asChild
						>
							<Link to="/login">
								<IconGlobe className="size-5 mr-2" />
								OPEN WEB APP
							</Link>
						</Button>
					</div>

					<div className="pt-8 text-muted-foreground text-sm space-y-1">
						<p>App Version 1.0 • Target SDK: 35 (Android 15)</p>
						<p>Minimum SDK: 21 (Android 5.0)</p>
						<p>Last Updated: May 2026</p>
					</div>
				</div>

				<div className="relative flex justify-center items-center animate-in slide-in-from-right duration-700">
					{/* Decorative background blobs */}
					<div className="absolute -top-24 -right-24 size-96 bg-primary/5 rounded-full blur-3xl" />
					<div className="absolute -bottom-24 -left-24 size-96 bg-secondary/10 rounded-full blur-3xl" />

					{/* Phone Mockup */}
					<div className="relative w-[300px] h-[600px] bg-foreground rounded-[3rem] p-3 shadow-2xl border-4 border-muted">
						<div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-foreground rounded-b-2xl z-20" />
						<div className="w-full h-full bg-background rounded-[2.25rem] overflow-hidden relative group">
							<div className="absolute inset-0 bg-gradient-to-b from-secondary to-primary flex flex-col items-center justify-center p-8 text-foreground text-center">
								<HiramiLogoDark className="size-32 mb-2.5" />
								<DisplayLarge className="text-4xl">Hirami</DisplayLarge>
								<TitleSmall className="text-[0.65rem]">Equipment Management System</TitleSmall>
							</div>

							{/* Mock UI overlay */}
							<div className="absolute inset-0 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 overflow-hidden">
								<img
									src={hiramiMobile}
									alt="Hirami Mobile App"
									className="w-full h-full object-cover"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
