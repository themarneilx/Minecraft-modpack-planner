import type { StatusInfo } from '@/lib/data';
import styles from './Legend.module.css';

interface LegendProps {
  statuses: StatusInfo[];
  open: boolean;
}

export default function Legend({ statuses, open }: LegendProps) {
  return (
    <div className={`${styles.panel} ${open ? styles.open : ''}`}>
      <div className={styles.grid}>
        {statuses.map((s) => (
          <div key={s.id} className={styles.item}>
            <span className={styles.swatch} style={{ background: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
