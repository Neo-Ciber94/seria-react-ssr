import { EntryClient } from "framework/react";
import React from "react";
import { hydrateRoot } from "react-dom/client";

hydrateRoot(
	document,
	<React.StrictMode>
		<EntryClient />
	</React.StrictMode>,
);
