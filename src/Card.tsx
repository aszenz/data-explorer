import { Link } from "react-router";
import type { JSX } from "react/jsx-runtime";
import ArrowRightIcon from "../img/arrow-right.svg?react";

export default Card;
export type { CardProps };

type CardProps = {
  to: string;
  icon: JSX.Element;
  title: string;
  description?: string;
  className?: string;
};

function Card({
  to,
  icon,
  title,
  description,
  className = "",
}: CardProps): JSX.Element {
  return (
    <Link to={to} className={`card ${className}`}>
      <div className="card-icon">{icon}</div>
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        {description && <p className="card-description">{description}</p>}
      </div>
      <div className="card-arrow">
        <ArrowRightIcon aria-label="View details" />
      </div>
    </Link>
  );
}
