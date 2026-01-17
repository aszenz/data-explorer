import { useState, useRef, useEffect } from "react";
import {
  Link,
  useParams,
  useLocation,
  useSearchParams,
  useNavigate,
} from "react-router";
import { useRuntime } from "./contexts";
import { type JSX } from "react/jsx-runtime";

export default Breadcrumbs;

type BreadcrumbsProps = {
  models: Record<string, string>;
  notebooks: Record<string, string>;
};

function Breadcrumbs({ models, notebooks }: BreadcrumbsProps): JSX.Element {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modelName = params["model"];
  const sourceName = params["source"];
  const queryName = params["query"];
  const notebookName = params["notebook"];
  const queryParam = searchParams.get("query");

  const isHomePage = location.pathname === "/";
  const isModelPage = location.pathname.startsWith("/model/");
  const isNotebookPage = location.pathname.startsWith("/notebook/");
  const isExplorerPage = location.pathname.includes("/explorer/");
  const isPreviewPage = location.pathname.includes("/preview/");
  const isQueryPage = location.pathname.includes("/query/");

  if (isHomePage) {
    return <></>;
  }

  return (
    <nav className="breadcrumbs">
      <button
        type="button"
        className="back-button"
        onClick={() => {
          void navigate(-1);
        }}
        title="Go back"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
      </button>
      <Link to="/" className="breadcrumb-item">
        Home
      </Link>

      {isModelPage && modelName && (
        <>
          <span className="breadcrumb-separator">/</span>
          <BreadcrumbDropdown
            label={modelName}
            linkTo={`/model/${modelName}`}
            items={Object.keys(models).map((name) => ({
              name,
              to: `/model/${encodeURIComponent(name)}`,
              active: name === modelName,
            }))}
            isCurrent={!isExplorerPage && !isPreviewPage && !isQueryPage}
          />
        </>
      )}

      {isExplorerPage && sourceName && modelName && (
        <SourceBreadcrumb modelName={modelName} sourceName={sourceName} />
      )}

      {isExplorerPage && queryParam && (
        <>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item query">{queryParam}</span>
        </>
      )}

      {isPreviewPage && sourceName && (
        <>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item current">{sourceName}</span>
        </>
      )}

      {isQueryPage && queryName && modelName && (
        <QueryBreadcrumb modelName={modelName} queryName={queryName} />
      )}

      {isNotebookPage && notebookName && (
        <>
          <span className="breadcrumb-separator">/</span>
          <BreadcrumbDropdown
            label={notebookName}
            items={Object.keys(notebooks).map((name) => ({
              name,
              to: `/notebook/${encodeURIComponent(name)}`,
              active: name === notebookName,
            }))}
            isCurrent
          />
        </>
      )}
    </nav>
  );
}

type DropdownItem = {
  name: string;
  to: string;
  active: boolean;
};

function BreadcrumbDropdown({
  label,
  linkTo,
  items,
  isCurrent = false,
}: {
  label: string;
  linkTo?: string;
  items: DropdownItem[];
  isCurrent?: boolean;
}): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (items.length <= 1) {
    return isCurrent ? (
      <span className="breadcrumb-item current">{label}</span>
    ) : (
      <Link to={linkTo ?? "#"} className="breadcrumb-item">
        {label}
      </Link>
    );
  }

  return (
    <div
      className={`breadcrumb-dropdown ${isOpen ? "open" : ""}`}
      ref={dropdownRef}
    >
      <button
        type="button"
        className={`breadcrumb-item ${isCurrent ? "current" : ""}`}
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      >
        {label}
      </button>
      {isOpen && (
        <ul className="breadcrumb-menu">
          {items.map((item) => (
            <li key={item.name}>
              <Link
                to={item.to}
                className={item.active ? "active" : ""}
                onClick={() => {
                  setIsOpen(false);
                }}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SourceBreadcrumb({
  modelName,
  sourceName,
}: {
  modelName: string;
  sourceName: string;
}): JSX.Element {
  const { model } = useRuntime();
  const sources = model.exportedExplores;

  return (
    <>
      <span className="breadcrumb-separator">/</span>
      <BreadcrumbDropdown
        label={sourceName}
        items={sources.map((explore) => ({
          name: explore.name,
          to: `/model/${modelName}/explorer/${explore.name}`,
          active: explore.name === sourceName,
        }))}
        isCurrent
      />
    </>
  );
}

function QueryBreadcrumb({
  modelName,
  queryName,
}: {
  modelName: string;
  queryName: string;
}): JSX.Element {
  const { model } = useRuntime();
  const queries = model.namedQueries;

  return (
    <>
      <span className="breadcrumb-separator">/</span>
      <BreadcrumbDropdown
        label={queryName}
        items={queries.map((query) => ({
          name: query.name,
          to: `/model/${modelName}/query/${query.name}`,
          active: query.name === queryName,
        }))}
        isCurrent
      />
    </>
  );
}
