import Markdown from "react-markdown";

export default MarkdownRenderer;

function MarkdownRenderer({ content }: { content: string }) {
  return <Markdown>{content}</Markdown>;
}
