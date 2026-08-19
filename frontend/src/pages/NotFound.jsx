import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="not-found page--fade-in">
      <div className="not-found__content">
        <span className="not-found__code">404</span>
        <h1 className="not-found__title">Page not found</h1>
        <p className="not-found__text">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link to="/" className="btn btn--primary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
