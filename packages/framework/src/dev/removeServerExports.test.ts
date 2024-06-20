import { removeServerExports } from "./removeServerExports"


describe("Remove server exports", () => {
    test("Replace functions", async () => {
        const { code } = await removeServerExports({
            fileName: "functions.ts",
            source: js`
                export function serverFunction() {}
                export function clientFunction() {}
            `,
            removeExports: ["serverFunction"]
        });

        expect(js(code)).toStrictEqual(js`
            export function serverFunction() {
                throw new Error("'serverFunction' is not available on the client");
            }
            export function clientFunction() {}
        `)
    });

    test("Replace const arrow function", async () => {
        const { code } = await removeServerExports({
            fileName: "functions.ts",
            source: js`
                export const serverFunction = () => {};
                export const clientFunction = () => {};
            `,
            removeExports: ["serverFunction"]
        });

        expect(js(code)).toStrictEqual(js`
            export const serverFunction = () => {
                throw new Error("'serverFunction' is not available on the client");
            };
            export const clientFunction = () => {};
        `)
    });

    test("Replace const function", async () => {
        const { code } = await removeServerExports({
            fileName: "functions.ts",
            source: js`
                export const serverFunction = function () {};
                export const clientFunction = function () {};
            `,
            removeExports: ["serverFunction"]
        });

        expect(js(code)).toStrictEqual(js`
            export const serverFunction = function () {
                throw new Error("'serverFunction' is not available on the client");
            };
            export const clientFunction = function () {};
        `)
    });

    test("Replace const referencing value", async () => {
        const { code } = await removeServerExports({
            fileName: "functions.ts",
            source: js`
                const serverData = { x: 10 };
                export const serverFunction = serverData;
                export const clientFunction = function () {};
            `,
            removeExports: ["serverFunction"]
        });

        expect(js(code)).toStrictEqual(js`
            export const serverFunction = () => {
                throw new Error("'serverFunction' is not available on the client");
            };
            export const clientFunction = function () {};
        `)
    });
});

function js(source: string | TemplateStringsArray) {
    if (typeof source === 'string') {
        return source.split('\n').map(line => line.trimStart()).join("\n").trim().replace(/\n/g, "");
    }

    return source
        .map(s => s.split('\n').map(line => line.trimStart()).join('\n'))
        .join('\n')
        .trim()
        .replace(/\n/g, "");
}