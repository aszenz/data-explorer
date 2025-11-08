import Markdown from "react-markdown";
import { type JSX } from "react/jsx-runtime";

export default MarkdownRenderer;

function MarkdownRenderer({ content }: { content: string }): JSX.Element {
  return <Markdown>{content}</Markdown>;
}
