import { describe, expect, it } from "vitest";
import { parseMds } from "./index.js";

describe("parseMds", () => {
  it("parses frontmatter, markdown, and a basic semantic block", () => {
    const document = parseMds(`---
title: Fixture
draft: false
---

# Fixture

::: warning
Dangerous operations need care.
:::
`);

    expect(document.frontmatter).toEqual({
      title: "Fixture",
      draft: false
    });
    expect(document.diagnostics).toEqual([]);
    expect(document.children).toMatchObject([
      {
        type: "markdown",
        value: "\n# Fixture\n"
      },
      {
        type: "block",
        blockType: "warning",
        children: [
          {
            type: "markdown",
            value: "Dangerous operations need care."
          }
        ]
      }
    ]);
  });

  it("parses named and nested blocks", () => {
    const document = parseMds(`::: cards

::: card first
# First
:::

:::
`);

    expect(document.diagnostics).toEqual([]);
    expect(document.children).toMatchObject([
      {
        type: "block",
        blockType: "cards",
        children: [
          {
            type: "block",
            blockType: "card",
            name: "first",
            children: [
              {
                type: "markdown",
                value: "# First"
              }
            ]
          }
        ]
      }
    ]);
  });

  it("reports forbidden block attributes", () => {
    const document = parseMds(`::: grid {columns=3}
content
:::
`);

    expect(document.diagnostics).toEqual([
      expect.objectContaining({
        code: "invalid-block-name",
        severity: "error"
      }),
      expect.objectContaining({
        code: "forbidden-block-attributes",
        severity: "error"
      })
    ]);
  });

  it("does not parse escaped block markers or fenced code markers", () => {
    const document = parseMds(`\\::: hero

\`\`\`mds
::: warning
inside code
:::
\`\`\`
`);

    expect(document.diagnostics).toEqual([]);
    expect(document.children).toHaveLength(1);
    expect(document.children[0]).toMatchObject({
      type: "markdown",
      value: "\\::: hero\n\n```mds\n::: warning\ninside code\n:::\n```\n"
    });
  });
});
