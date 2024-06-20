import { removeServerExports } from "./removeServerExports";
import { js } from "./test/utils";

describe("Remove server exports", () => {
	test("Replace functions", async () => {
		const { code } = await removeServerExports({
			fileName: "functions.js",
			source: js`
                export function serverFunction() {}
                export function clientFunction() {}
            `,
			removeExports: ["serverFunction"],
		});

		expect(js(code)).toStrictEqual(js`
            export function serverFunction() {
                throw new Error("'serverFunction' is not available on the client");
            }
            export function clientFunction() {}
        `);
	});

	test("Replace const arrow function", async () => {
		const { code } = await removeServerExports({
			fileName: "functions.js",
			source: js`
                export const serverFunction = () => {};
                export const clientFunction = () => {};
            `,
			removeExports: ["serverFunction"],
		});

		expect(js(code)).toStrictEqual(js`
            export const serverFunction = () => {
                throw new Error("'serverFunction' is not available on the client");
            };
            export const clientFunction = () => {};
        `);
	});

	test("Replace const function", async () => {
		const { code } = await removeServerExports({
			fileName: "functions.js",
			source: js`
                export const serverFunction = function () {};
                export const clientFunction = function () {};
            `,
			removeExports: ["serverFunction"],
		});

		expect(js(code)).toStrictEqual(js`
            export const serverFunction = function () {
                throw new Error("'serverFunction' is not available on the client");
            };
            export const clientFunction = function () {};
        `);
	});

	test("Replace const referencing identifier", async () => {
		const { code } = await removeServerExports({
			fileName: "functions.js",
			source: js`
                const serverData = { x: 10 };
                export const serverFunction = serverData;
                export const clientFunction = function () {};
            `,
			removeExports: ["serverFunction"],
		});

		expect(js(code)).toStrictEqual(js`
            export const serverFunction = () => {
                throw new Error("'serverFunction' is not available on the client");
            };
            export const clientFunction = function () {};
        `);
	});

	test("Replace function referencing identifier", async () => {
		const { code } = await removeServerExports({
			fileName: "functions.js",
			source: js`
                const serverData = { x: 10 };
                export function serverFunction() {
                    return serverData;
                }
                export const clientFunction = function () {};
            `,
			removeExports: ["serverFunction"],
		});

		expect(js(code)).toStrictEqual(js`
            export function serverFunction() {
                throw new Error("'serverFunction' is not available on the client");
            }
            export const clientFunction = function () {};
        `);
	});

    test("With typescript", async () => {
		const { code } = await removeServerExports({
			fileName: "functions.ts",
			source: js`
                export function serverFunction(text: string) {}
                export function clientFunction(x: number, b: string) {}
            `,
			removeExports: ["serverFunction"],
		});

		expect(js(code)).toStrictEqual(js`
            export function serverFunction(text) {
                throw new Error("'serverFunction' is not available on the client");
            }
            export function clientFunction(x, b) {}
        `);
	});


    test("Transform with jsx", async () => {
		const { code } = await removeServerExports({
			fileName: "functions.jsx",
			source: js`
                export function serverFunction() {
                    return 10;
                }

                export const clientFunction = function () {};

                export default function Component() {
                    return <h1>Hello World!</h1>;
                }
            `,
			removeExports: ["serverFunction"],
		});

		expect(js(code)).toStrictEqual(js`
            import{jsx}from "react/jsx-runtime";
            export function serverFunction() {
                throw new Error("'serverFunction' is not available on the client");
            }

            export const clientFunction = function () {};

            export default function Component() {
                return/*@__PURE__*/jsx("h1",{children:"Hello World!"});
            }
        `);
	});
});
