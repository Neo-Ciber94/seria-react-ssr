function minifyJS(code: string) {
	// Remove leading and trailing whitespace from each line
	return (
		code
			.split("\n")
			.map((line) => line.trim())
			.join("")

			// Remove multiple spaces and replace them with a single space
			.replace(/\s+/g, " ")

			// Remove spaces before and after specific characters
			.replace(/\s*([{}();,:+/*=<>-])\s*/g, "$1")

			// Remove spaces before and after parentheses
			.replace(/\s*\(\s*/g, "(")
			.replace(/\s*\)\s*/g, ")")

			// Remove spaces before and after brackets
			.replace(/\s*\[\s*/g, "[")
			.replace(/\s*\]\s*/g, "]")
	);
}

export function js(source: string | TemplateStringsArray) {
	if (typeof source === "string") {
		return minifyJS(source);
	}

	return minifyJS(
		source
			.map((s) =>
				s
					.split("\n")
					.map((line) => line.trimStart())
					.join("\n"),
			)
			.join("\n"),
	);
}
