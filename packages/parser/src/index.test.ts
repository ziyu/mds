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

  it("parses block attributes and generated ids", () => {
    const document = parseMds(`::: hero landing motion="fade up" delay=120 featured
# Landing Page!
:::

::: section
# 产品介绍
:::

::: section
# 产品介绍
:::
`);

    expect(document.diagnostics).toEqual([]);
    expect(document.children).toMatchObject([
      {
        type: "block",
        blockType: "hero",
        name: "landing",
        id: "landing",
        attrs: {
          motion: "fade up",
          delay: 120,
          featured: true
        }
      },
      {
        type: "block",
        blockType: "section",
        id: "产品介绍"
      },
      {
        type: "block",
        blockType: "section",
        id: "产品介绍-2"
      }
    ]);
  });

  it("reports malformed, curly, duplicate, and unsafe block attributes", () => {
    const document = parseMds(`::: grid {columns=3}
content
:::

::: card onclick="alert(1)" tone=info tone=warning
content
:::
`);

    expect(document.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "curly-block-attributes",
        severity: "error"
      }),
      expect.objectContaining({
        code: "invalid-block-attribute",
        severity: "error"
      }),
      expect.objectContaining({
        code: "unsafe-block-attribute",
        severity: "warning"
      }),
      expect.objectContaining({
        code: "duplicate-block-attribute",
        severity: "warning"
      })
    ]));
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
      value: "::: hero\n\n```mds\n::: warning\ninside code\n:::\n```\n"
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

  it("parses condition, each, data, inline actions, and interpolation nodes", () => {
    const document = parseMds(`@state liked true
@list features
- fast
- small

Inline {{ liked }} and [Docs -> /docs].

::: if liked
Visible
:::

::: unless hidden
Fallback
:::

::: each features
- {{ item }}
:::

::: data products
- name: Basic
  price: 0
:::
`);

    expect(document.diagnostics).toEqual([]);
    expect(document.children).toMatchObject([
      {
        type: "stateDeclaration",
        name: "liked",
        value: "true"
      },
      {
        type: "listDeclaration",
        name: "features",
        items: ["fast", "small"]
      },
      {
        type: "markdown",
        inlines: [
          expect.objectContaining({
            type: "text"
          }),
          {
            type: "interpolation",
            path: "liked",
            position: expect.any(Object)
          },
          expect.objectContaining({
            type: "text"
          }),
          {
            type: "actionLink",
            label: "Docs",
            kind: "primary",
            target: "/docs",
            args: [],
            position: expect.any(Object)
          },
          expect.objectContaining({
            type: "text"
          })
        ]
      },
      {
        type: "conditionBlock",
        condition: "if",
        name: "liked"
      },
      {
        type: "conditionBlock",
        condition: "unless",
        name: "hidden"
      },
      {
        type: "eachBlock",
        listName: "features"
      },
      {
        type: "dataBlock",
        name: "products",
        value: "- name: Basic\n  price: 0"
      }
    ]);
  });

  it("reports invalid action usage, invalid interpolation, unmatched close, and missing semantic names", () => {
    const document = parseMds(`:::

Bad {{ user.name.toUpperCase() }}.

[Nope !bad/action alert]
[Submit !submit]

::: if
missing
:::
`);

    expect(document.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "unmatched-block-close",
      "invalid-action-name",
      "invalid-interpolation",
      "invalid-action-args",
      "missing-block-name"
    ]);
  });

  it("allows custom action names with arbitrary string arguments", () => {
    const document = parseMds(`[发送 !lead.submit contact primary 42]`);

    expect(document.diagnostics).toEqual([]);
    expect(document.children).toMatchObject([
      {
        type: "actionLink",
        action: "lead.submit",
        args: ["contact", "primary", "42"]
      }
    ]);
  });

  it("keeps data block contents raw", () => {
    const document = parseMds(`::: data demo
::: warning
not a block here
:::
`);

    expect(document.children).toMatchObject([
      {
        type: "dataBlock",
        name: "demo",
        value: "::: warning\nnot a block here"
      }
    ]);
  });
});
