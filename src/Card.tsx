import { Link } from "react-router";
import type { JSX } from "react/jsx-runtime";

export default Card;
export type { CardProps };

type CardProps = {
  to: string;
  icon: JSX.Element;
  title: string;
  className?: string;
};

function Card({ to, icon, title, className = "" }: CardProps): JSX.Element {
  return (
    <Link to={to} className={`card ${className}`}>
      <div className="card-icon">{icon}</div>
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
      </div>
    </Link>
  );
}
