import type { ReactNode } from 'react';
import styles from './Layout.module.css';

type LayoutProps = {
  children: ReactNode;
  title?: string;
  headerAction?: ReactNode;
};

export function Layout({ children, title, headerAction }: LayoutProps) {
  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        {title && (
          <header className={styles.header}>
            <h1 className={styles.headerTitle}>{title}</h1>
            {headerAction}
          </header>
        )}
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

export function CenterMessage({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.center}>
      <h2 className={styles.centerTitle}>{title}</h2>
      {body && <p className={styles.centerBody}>{body}</p>}
      {children}
    </div>
  );
}
