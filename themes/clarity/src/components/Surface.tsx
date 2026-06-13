/** @jsx jsx */
/** @jsxFrag Fragment */
import {
  Content,
  Fragment,
  Root,
  Slots,
  jsx,
  type JsxChild,
  type TemplateBlock
} from "../../../../packages/theme-loader/src/jsx";

export function Surface(props: {
  block: TemplateBlock;
  as?: string;
  className: string;
  children?: JsxChild;
}): JsxChild {
  return (
    <Root block={props.block} as={props.as ?? "section"} className={props.className}>
      {props.children ?? (
        <>
          <Content block={props.block} />
          <Slots block={props.block} />
        </>
      )}
    </Root>
  );
}

export function Flow(props: { block: TemplateBlock }): JsxChild {
  return (
    <>
      <Content block={props.block} />
      <Slots block={props.block} />
    </>
  );
}
