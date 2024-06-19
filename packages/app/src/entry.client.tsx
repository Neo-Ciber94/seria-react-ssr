import React from "react";
import { EntryClient } from "framework/react";
import { hydrateRoot } from "react-dom/client";

hydrateRoot(
	document,
	<React.StrictMode>
		<EntryClient />
	</React.StrictMode>,
);
