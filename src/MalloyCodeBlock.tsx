import { useCallback, useEffect, useState } from "react";
import { createHighlighterCore } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import malloyGrammar from "@malloydata/syntax-highlight/grammars/malloy/malloy.tmGrammar.json";
import type { JSX } from "react/jsx-runtime";
import CopyIconSvg from "../img/copy.svg?react";
import CheckIconSvg from "../img/check.svg?react";

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

const CopyIcon = CopyIconSvg;
const CheckIcon = CheckIconSvg;

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
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
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
