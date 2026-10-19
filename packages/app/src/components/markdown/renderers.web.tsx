import { Text } from "react-native";
import {
  forwardRef,
  useCallback,
  useMemo,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactElement,
} from "react";
import type {
  CodeBlockRendererProps,
  LinkRendererProps,
  MarkdownRenderers,
} from "react-native-enriched-markdown";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import {
  useAssistantFileLinkEnvironment,
  useFileLink,
  type AssistantFileLinkSource,
  type InlinePathTarget,
} from "@/assistant-file-links";
import { AssistantFileLinkContextMenuContent } from "@/assistant-file-links/file-context-menu";
import { ContextMenu, useContextMenu } from "@/components/ui/context-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { HighlightedCodeBlock } from "@/components/highlighted-code-block";
import type { OpenFileDisposition } from "@/workspace/file-open";
import type { Theme } from "@/styles/theme";
import { MermaidFence } from "./fence/mermaid";
import { markdownLinkSource } from "./source";

const ThemedCodeBlock = withUnistyles(HighlightedCodeBlock);
const codeStyle = (theme: Theme) => ({
  inheritedStyles: {
    color: theme.colors.foreground,
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.fontSize.code,
  },
  textStyle: { backgroundColor: theme.colors.surface2, padding: 12, borderRadius: 8 },
});
function WebCodeBlock({ code, language }: CodeBlockRendererProps) {
  if (language?.toLowerCase() === "mermaid") return <MermaidFence code={code} />;
  return <ThemedCodeBlock code={code} language={language} uniProps={codeStyle} />;
}

// The library styles links inline, so a stylesheet :hover rule cannot underline them.
const LINK_HOVER_STYLE = { textDecoration: "underline" } as const;

function WebLink({ link, anchorProps, children }: LinkRendererProps) {
  const source = markdownLinkSource(link.url, link.sourceType);
  const { target, tooltipPath, onHoverIn, open } = useFileLink(source);
  const environment = useAssistantFileLinkEnvironment();
  const [hovered, setHovered] = useState(false);
  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);
  const anchorStyle = useMemo(
    () => ({
      ...anchorProps.style,
      overflowWrap: "anywhere" as const,
      ...(hovered ? LINK_HOVER_STYLE : null),
    }),
    [anchorProps.style, hovered],
  );
  const anchor = (
    <a
      {...anchorProps}
      style={anchorStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </a>
  );
  if (!target) {
    return <WebLinkTooltip anchor={anchor} tooltipPath={tooltipPath} onHoverIn={onHoverIn} />;
  }
  return (
    <ContextMenu>
      <WebLinkContextMenuBody
        anchor={anchor}
        tooltipPath={tooltipPath}
        onHoverIn={onHoverIn}
        source={source}
        target={target}
        serverId={environment.serverId ?? ""}
        workspaceRoot={environment.workspaceRoot}
        onOpen={open}
      />
    </ContextMenu>
  );
}

function WebLinkTooltip({
  anchor,
  tooltipPath,
  onHoverIn,
  onContextMenu,
}: {
  anchor: ReactElement;
  tooltipPath: string | null;
  onHoverIn: () => void;
  onContextMenu?: ComponentProps<"span">["onContextMenu"];
}): ReactElement {
  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild onHoverIn={onHoverIn}>
        <InlineLinkTrigger onContextMenu={onContextMenu}>{anchor}</InlineLinkTrigger>
      </TooltipTrigger>
      {tooltipPath ? (
        <TooltipContent side="top" align="start" maxWidth={520}>
          <Text selectable={false} style={styles.tooltipPath}>
            {tooltipPath}
          </Text>
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
}

/**
 * Right-click actions for a resolvable file link. The menu root renders no DOM and the
 * handler sits on the existing trigger span, so the library's prose paragraphs keep
 * only valid inline elements.
 */
function WebLinkContextMenuBody({
  anchor,
  tooltipPath,
  onHoverIn,
  source,
  target,
  serverId,
  workspaceRoot,
  onOpen,
}: {
  anchor: ReactElement;
  tooltipPath: string | null;
  onHoverIn: () => void;
  source: AssistantFileLinkSource;
  target: InlinePathTarget;
  serverId: string;
  workspaceRoot?: string;
  onOpen: (source: AssistantFileLinkSource, disposition: OpenFileDisposition) => void;
}): ReactElement {
  const ctx = useContextMenu();
  const handleContextMenu = useCallback(
    (event: MouseEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
      ctx.setAnchorRect({ x: event.pageX, y: event.pageY, width: 0, height: 0 });
      ctx.setOpen(true);
    },
    [ctx],
  );
  return (
    <>
      <WebLinkTooltip
        anchor={anchor}
        tooltipPath={tooltipPath}
        onHoverIn={onHoverIn}
        onContextMenu={handleContextMenu}
      />
      <AssistantFileLinkContextMenuContent
        source={source}
        target={target}
        serverId={serverId}
        workspaceRoot={workspaceRoot}
        onOpen={onOpen}
        testIDPrefix="assistant-file-link"
      />
    </>
  );
}

// TooltipTrigger also supplies native Pressable handlers; forward only DOM events.
// A View renders a div, which is invalid inside the library's prose paragraphs.
const InlineLinkTrigger = forwardRef<HTMLSpanElement, ComponentProps<"span">>(
  function InlineLinkTrigger(
    { children, onMouseEnter, onMouseLeave, onFocus, onBlur, onContextMenu },
    ref,
  ) {
    return (
      <span
        ref={ref}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        onContextMenu={onContextMenu}
      >
        {children}
      </span>
    );
  },
);
const styles = StyleSheet.create((theme) => ({
  tooltipPath: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.normal,
  },
}));

export const WEB_RENDERERS: MarkdownRenderers = { codeBlock: WebCodeBlock, link: WebLink };
