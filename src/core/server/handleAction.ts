import { decode } from "seria/form-data";
import { stringifyToStream } from "seria";
import { matchAction } from "../../$routes";
import { HEADER_SERVER_ACTION } from "../constants";

export async function handleAction(request: Request) {
  const actionId = request.headers.get(HEADER_SERVER_ACTION) ?? "";
  const match = matchAction(actionId);

  if (!match) {
    return new Response(null, {
      status: 404,
    });
  }

  const formData = await request.formData();

  try {
    const args = decode(formData) as any[];
    const result = await match.action(...args);
    const stream = stringifyToStream(result);
    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "application/json+seria",
        "cache-control": "no-cache",
      },
    });
  } catch (err) {
    console.error(err);
    return new Response(null, {
      status: 500,
    });
  }
}
