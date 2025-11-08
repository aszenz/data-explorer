import type * as malloyInterfaces from "@malloydata/malloy-interfaces";
import { useEffect, useMemo, useRef } from "react";
import { MalloyRenderer } from "@malloydata/render";
import { type JSX } from "react/jsx-runtime";

export default RenderedResult;

function RenderedResult({
  result,
}: {
  result: malloyInterfaces.Result;
}): JSX.Element {
  const vizContainer = useRef<HTMLDivElement>(null);
  const viz = useMemo(() => {
    const renderer = new MalloyRenderer();
    const _viz = renderer.createViz({
      tableConfig: { enableDrill: false },
    });
    return _viz;
  }, []);

  useEffect(() => {
    if (vizContainer.current) {
      viz.setResult(result);
      viz.render(vizContainer.current);
    }
  }, [viz, result]);

  return <div style={{ height: "99%" }} ref={vizContainer} />;
}
