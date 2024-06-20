import { useServerContext } from "./context";

const IS_DEV = process.env.NODE_ENV !== "production";
const BROWSER_ENTRY = "src/entry.client.tsx";
const SERIA_ENTRY = "assets/seria.js";

export default function Scripts() {
	const { manifest } = useServerContext();

	const seriaSrc = IS_DEV ? `build/client/${SERIA_ENTRY}` : SERIA_ENTRY;
	const entrySrc = IS_DEV || !manifest ? BROWSER_ENTRY : manifest[BROWSER_ENTRY].file;

	return (
		<>
			<script src={`/${seriaSrc}`} />
			<script type="module" rel="modulepreload" src={`/${entrySrc}`} />
		</>
	);
}
