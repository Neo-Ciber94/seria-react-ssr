import { DevScripts, Scripts } from "framework/react";
import { Router } from "framework/router";
import { Suspense } from "react";

export default function App() {
	console.log("Calling actual <App/>");

	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" href="/favicon.png" />
				<title>This is my application</title>
				<DevScripts />
			</head>
			<body>
				<Suspense>
					<Router />
				</Suspense>
				<Scripts />
			</body>
		</html>
	);
}
