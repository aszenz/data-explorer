import { useCallback, useEffect, useState } from "react";
import { createHighlighterCore } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import malloyGrammar from "@malloydata/syntax-highlight/grammars/malloy/malloy.tmGrammar.json";
import type { JSX } from "react/jsx-runtime";

export default MalloyCodeBlock;

type MalloyCodeBlockProps = {
  code: string;
  showCopy?: boolean;
};

const malloyLang = {
  ...malloyGrammar,
  name: "malloy",
};

let highlighterPromise: ReturnType<typeof createHighlighterCore> | null = null;

async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [import("@shikijs/themes/light-plus")],
      langs: [malloyLang as never],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighterPromise;
}

function CopyIcon(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function MalloyCodeBlock({
  code,
  showCopy = true,
}: MalloyCodeBlockProps): JSX.Element {
  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getHighlighter()
      .then((highlighter) => {
        if (cancelled) return;
        const result = highlighter.codeToHtml(code, {
          lang: "malloy",
          theme: "light-plus",
        });
        setHtml(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("Syntax highlighting error:", err);
        setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const copyButton = showCopy ? (
    <button
      className={`code-copy-button ${copied ? "copied" : ""}`}
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy code"}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  ) : null;

  if (error) {
    return (
      <div className="malloy-code-block">
        {copyButton}
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="malloy-code-block">
        {copyButton}
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="malloy-code-block">
      {copyButton}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
