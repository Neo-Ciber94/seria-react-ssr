export default function LiveReload() {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <>
      <script type="module" src="/@vite/client"></script>
      <script
        type="module"
        dangerouslySetInnerHTML={{
          __html: `
import RefreshRuntime from "/@react-refresh"
RefreshRuntime.injectIntoGlobalHook(window)
window.$RefreshReg$ = () => {}
window.$RefreshSig$ = () => (type) => type
window.__vite_plugin_react_preamble_installed__ = true
`,
        }}
      />
    </>
  );
}
