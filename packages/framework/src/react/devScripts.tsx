export default function DevScripts() {
	if (process.env.NODE_ENV === "production") {
		return null;
	}

	return (
		<>
			<script type="module" src="/@vite/client" />
			<script
				type="module"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: raw string
				dangerouslySetInnerHTML={{
					__html: `
						import RefreshRuntime from "/@react-refresh"
						RefreshRuntime.injectIntoGlobalHook(window)
						window.$RefreshReg$ = () => {}
						window.$RefreshSig$ = () => (type) => type
						window.__vite_plugin_react_preamble_installed__ = true`,
				}}
			/>
		</>
	);
}
