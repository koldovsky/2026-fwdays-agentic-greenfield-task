import Link from "next/link";

/**
 * Global header / navigation (app-shell, NFR-RESP-01).
 * Every interactive control has a ≥ 44px hit area (see .pk-nav__link,
 * .pk-brand, .pk-btn in the design system).
 */
export function Header() {
  return (
    <header className="pk-header">
      <div className="pk-container pk-header__inner">
        <Link href="/" className="pk-brand">
          Прохідний
        </Link>
        <nav className="pk-nav" aria-label="Головна навігація">
          <Link href="/" className="pk-nav__link pk-nav__link--active">
            Головна
          </Link>
          <Link href="/" className="pk-btn pk-btn--primary pk-btn--sm">
            Оцінити шанси
          </Link>
        </nav>
      </div>
    </header>
  );
}
