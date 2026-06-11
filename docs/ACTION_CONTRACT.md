# MDS Action Contract

MDS actions are declarative intent markers. MDS does not own business logic and does not require an application runtime.

## Syntax

```mds
[Label !action arg1 arg2 arg3]
```

The first token after `!` is the action name. Everything after the action name is an argument list.

```mds
[发送 !lead.submit contact primary 42]
```

This parses as:

```txt
label: 发送
action: lead.submit
args: ["contact", "primary", "42"]
```

Custom actions may use any number of string arguments. MDS does not interpret custom arguments.

## Action Names

Action names must be simple identifiers with optional namespace separators:

```txt
submit
toggle
lead.submit
cart:add
flow-next
```

Action names must not contain slashes, spaces, quotes, or JavaScript.

## Native Actions

MDS handles only a very small native set:

```txt
submit formId
reset formId
```

These render to native HTML form controls:

```html
<button type="submit" form="contact" data-action="submit" data-target="contact">
```

Native actions must receive exactly one form id argument.

## Defined Actions

Themes or applications can define action names. The renderer only needs to know the names so it can avoid warnings.

Themes can declare supported actions in `theme.json`:

```json
{
  "name": "default",
  "actions": ["toggle", "open", "close"]
}
```

Applications can pass known action names to the renderer:

```ts
renderHtmlResult(document, {
  theme,
  knownActions: ["lead.submit", "cart.add"]
});
```

MDS does not prescribe how handlers are implemented. A theme or app can use event delegation on `data-action`.

## Missing Actions

If an action is not native and is not listed as known, rendering still succeeds but emits a warning.

```mds
[发送 !lead.submit contact]
```

Without a known handler, the HTML keeps the action metadata:

```html
<button
  type="button"
  class="action command"
  data-action="lead.submit"
  data-args="[&quot;contact&quot;]"
  data-action-missing="true"
  data-target="contact"
>
  发送
</button>
```

The warning is:

```txt
missing-action-handler: No handler registered for action "lead.submit".
```

This keeps generated HTML inspectable and lets an outer app attach behavior later.

## Boundaries

MDS does not:

- run arbitrary JavaScript
- define business workflows
- require an app-host package
- validate custom action argument meanings
- require developers to follow a complex manifest format

MDS does:

- parse action intent
- preserve action metadata in HTML
- make native form actions work
- warn when no handler is known
