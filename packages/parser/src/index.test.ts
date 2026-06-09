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

  it("parses slots, action links, media, forms, state, lists, and comments", () => {
    const document = parseMds(`@state liked false
@list features
- simple
- rich

%% hidden %%

::: hero landing
--- title
# Hello

--- actions
[Start -> /docs]
[More => /more]
[Site >> https://example.com]
[Open !toggle faq]
!video /demo.mp4
:::

::: form contact
? email 邮箱 邮箱地址
? role 选择 你的身份
- 开发者
- 设计师

[提交 !submit contact]
:::
`);

    expect(document.diagnostics).toEqual([]);
    expect(document.children).toMatchObject([
      {
        type: "stateDeclaration",
        name: "liked",
        value: "false"
      },
      {
        type: "listDeclaration",
        name: "features",
        items: ["simple", "rich"]
      },
      {
        type: "block",
        blockType: "hero",
        name: "landing",
        slots: [
          {
            type: "slot",
            name: "title"
          },
          {
            type: "slot",
            name: "actions"
          }
        ]
      },
      {
        type: "block",
        blockType: "form",
        name: "contact",
        children: [
          {
            type: "formField",
            name: "email",
            fieldType: "邮箱",
            label: "邮箱地址"
          },
          {
            type: "formField",
            name: "role",
            fieldType: "选择",
            label: "你的身份",
            options: ["开发者", "设计师"]
          },
          {
            type: "actionLink",
            kind: "command",
            action: "submit",
            args: ["contact"]
          }
        ]
      }
    ]);
  });

  it("reports unclosed blocks and comments", () => {
    const document = parseMds(`::: note
content

%%%
comment
`);

    expect(document.diagnostics).toEqual([
      expect.objectContaining({
        code: "unclosed-comment"
      }),
      expect.objectContaining({
        code: "unclosed-block"
      })
    ]);
  });
});
