import { useEffect, useState } from "react";
import { createHighlighterCore } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import malloyGrammar from "@malloydata/syntax-highlight/grammars/malloy/malloy.tmGrammar.json";
import type { JSX } from "react/jsx-runtime";

export default MalloyCodeBlock;

type MalloyCodeBlockProps = {
  code: string;
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

function MalloyCodeBlock({ code }: MalloyCodeBlockProps): JSX.Element {
  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string>("");

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

  if (error) {
    return (
      <pre>
        <code>{code}</code>
      </pre>
    );
  }

  if (!html) {
    return (
      <pre>
        <code>{code}</code>
      </pre>
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
