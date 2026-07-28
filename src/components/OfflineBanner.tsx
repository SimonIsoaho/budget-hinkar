import styles from './Banners.module.css';

type OfflineBannerProps = {
  online: boolean;
};

export function OfflineBanner({ online }: OfflineBannerProps) {
  if (online) return null;

  return (
    <div className={styles.banner} role="status">
      Ingen anslutning — ändringar sparas inte förrän du är online
    </div>
  );
}
