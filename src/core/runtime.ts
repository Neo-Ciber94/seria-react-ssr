import { encodeAsync } from "seria/form-data";
import { parseFromStream } from "seria";
import { HEADER_SERVER_ACTION, SERVER_ACTION_ROUTE } from "./constants";

type ServerActionProxyInput = {
  id: string;
  args: any[];
};

export async function createServerActionProxy(input: ServerActionProxyInput) {
  const body = await encodeAsync(input.args);
  const res = await fetch(SERVER_ACTION_ROUTE, {
    method: "POST",
    headers: {
      [HEADER_SERVER_ACTION]: input.id,
    },
    body,
  });

  if (res.redirected) {
    throw new Error("Redirection not implemented");
  }

  if (!res.ok) {
    throw new Error("Server action call failed: " + res.status);
  }

  if (!res.body) {
    throw new Error("Response was empty");
  }

  const stream = res.body.pipeThrough(new TextDecoderStream());
  const value = parseFromStream(stream);
  return value;
}
