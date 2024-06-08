import { encodeAsync } from "seria/form-data";
import { parseFromStream } from "seria";
import { HEADER_SERVER_ACTION } from "./constants";

type CallServerActionInput = {
  id: string;
  args: any[];
};

export async function callServerAction(input: CallServerActionInput) {
  const args = input.args;
  const body = await encodeAsync(args);
  const res = await fetch("/_action", {
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
