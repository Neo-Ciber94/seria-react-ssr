import { parse, parseFromResumableStream } from "seria";

declare global {
  var $seria_parse: typeof parse;
  var $seria_parse_from_resumable_stream: typeof parseFromResumableStream;
}

window.$seria_parse = parse;
window.$seria_parse_from_resumable_stream = parseFromResumableStream;
