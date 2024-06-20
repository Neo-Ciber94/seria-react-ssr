import { createServerActionReference } from "./createServerActionReference";
import { js } from "./test/utils";

describe("Create server action reference", () => {
	test("Create server action reference in function", async () => {
		const result = await createServerActionReference({
			fileName: "actions.ts",
			contents: js`
            export async function add(x, y) {
                return x + y;
            }
           `,
		});

		expect(js(result.code)).toStrictEqual(js`
            import { callServerAction } from "framework/runtime";
            
            export async function add(x, y) {
                return callServerAction({id:"actions#add",args:[...arguments]});
            }
        `);
	});

	test("Create server action reference in const arrow function", async () => {
		const result = await createServerActionReference({
			fileName: "actions.ts",
			contents: js`
            export const add = (x, y) => {
                return x + y;
            }
           `,
		});

		expect(js(result.code)).toStrictEqual(js`
            import { callServerAction } from "framework/runtime";
            
            export const add = function(){
                return callServerAction({id:"actions#add",args:[...arguments]});
            };
        `);
	});

	test("Create server action reference in const function", async () => {
		const result = await createServerActionReference({
			fileName: "actions.ts",
			contents: js`
            export const add = function(x, y){
                return x + y;
            }
           `,
		});

		expect(js(result.code)).toStrictEqual(js`
            import { callServerAction } from "framework/runtime";
            
            export const add = function(){
                return callServerAction({id:"actions#add",args:[...arguments]});
            };
        `);
	});

	test("Throw is exported non function", async () => {
		await expect(() => {
			return createServerActionReference({
				fileName: "actions.ts",
				contents: js`
                export const num = 1;
               `,
			});
		}).rejects.toThrow();
	});

	test("Do nothing on non exported value", async () => {
		const result = await createServerActionReference({
			fileName: "actions.ts",
			contents: js`
            const num = 1;
           `,
		});

		expect(js(result.code)).toStrictEqual(js`
            const num = 1;
        `);
	});

    test("Do nothing on non exported value", async () => {
		const result = await createServerActionReference({
			fileName: "actions.ts",
			contents: js`
            const num = 1;
           `,
		});

		expect(js(result.code)).toStrictEqual(js`
            const num = 1;
        `);
	});
});
