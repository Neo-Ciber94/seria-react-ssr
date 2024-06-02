import { parse } from "seria";

declare global {
  function $seria_parse(value: string): unknown;
}

window.$seria_parse = parse;
