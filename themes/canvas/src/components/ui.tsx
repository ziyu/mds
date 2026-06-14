import React from "react";
import { Content, Root, Slots, type ReactThemeBlock } from "@mds/theme-sdk-react";
import { cn } from "../lib/cn.js";

export function Surface(props: {
  block: ReactThemeBlock;
  as?: React.ElementType;
  className?: string;
  hidden?: boolean;
  motion?: string;
  motionAttr?: string;
  trigger?: string;
  delay?: number | string;
  duration?: number | string;
  stagger?: number | string;
  once?: boolean | string;
  tabIndex?: number;
  children?: React.ReactNode;
}) {
  const hiddenProps = props.hidden === undefined ? {} : { hidden: props.hidden };
  const motion = attrFallback(props.block, props.motionAttr ?? "motion", props.motion);
  return (
    <Root
      block={props.block}
      as={props.as ?? "section"}
      className={cn("mds-block", props.className)}
      data-motion={motion}
      data-motion-trigger={attrFallback(props.block, "trigger", props.trigger)}
      data-motion-delay={attrFallback(props.block, "delay", props.delay)}
      data-motion-duration={attrFallback(props.block, "duration", props.duration)}
      data-motion-stagger={attrFallback(props.block, "stagger", props.stagger)}
      data-motion-once={attrFallback(props.block, "once", props.once)}
      tabIndex={props.tabIndex}
      {...hiddenProps}
    >
      {props.children ?? <Flow block={props.block} />}
    </Root>
  );
}

function attrFallback(block: ReactThemeBlock, name: string, fallback: boolean | number | string | undefined): string {
  return fallback === undefined ? block.attr(name) : block.attr(name, String(fallback));
}

export function Flow(props: { block: ReactThemeBlock; className?: string }) {
  return (
    <div className={cn("mds-flow", props.className)}>
      <Content block={props.block} />
      <Slots block={props.block} />
    </div>
  );
}

export function Card(props: { block: ReactThemeBlock; className?: string; children?: React.ReactNode }) {
  return (
    <Surface
      block={props.block}
      as="article"
      motion="scale-in"
      duration={560}
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-xs",
        "transition-colors hover:border-ring/40",
        props.className
      )}
    >
      {props.children ?? <Flow block={props.block} />}
    </Surface>
  );
}

export function Badge(props: { children: React.ReactNode; tone?: "default" | "muted" | "info" | "warning" | "success" | "danger" }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        props.tone === "info" && "border-sky-200 bg-sky-50 text-sky-800",
        props.tone === "warning" && "border-amber-200 bg-amber-50 text-amber-900",
        props.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        props.tone === "danger" && "border-rose-200 bg-rose-50 text-rose-800",
        props.tone === "muted" && "border-border bg-muted text-muted-foreground",
        (props.tone === undefined || props.tone === "default") && "border-border bg-background text-foreground"
      )}
    >
      {props.children}
    </span>
  );
}

export function Panel(props: { block: ReactThemeBlock; className?: string; hidden?: boolean; children?: React.ReactNode }) {
  const hiddenProps = props.hidden === undefined ? {} : { hidden: props.hidden };
  return (
    <Surface
      block={props.block}
      motion="fade-up"
      duration={620}
      className={cn("rounded-xl border border-border bg-card p-5 shadow-xs", props.className)}
      {...hiddenProps}
    >
      {props.children ?? <Flow block={props.block} />}
    </Surface>
  );
}
