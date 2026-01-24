import { Link } from "react-router";
import { useId, type JSX, type ReactNode } from "react";

export default Menu;

type MenuProps = {
  trigger: ReactNode;
  items: MenuItem[];
  triggerClassName?: string;
};

type MenuItem = {
  name: string;
  to: string;
  active?: boolean;
};

function Menu({
  trigger,
  items,
  triggerClassName = "",
}: MenuProps): JSX.Element {
  const id = useId();
  const triggerId = `popover-trigger-${id}`;
  const popoverId = `${triggerId}-menu`;
  const anchorName = `--${triggerId}`;

  return (
    <div className="popover-menu">
      <button
        type="button"
        id={triggerId}
        className={triggerClassName}
        style={{ anchorName }}
        popoverTarget={popoverId}
      >
        {trigger}
      </button>
      <ul
        id={popoverId}
        popover="auto"
        className="popover-menu-list"
        style={{ positionAnchor: anchorName }}
      >
        {items.map((item) => (
          <li key={item.name}>
            <Link to={item.to} className={item.active ? "active" : ""}>
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
