import { useEffect } from 'react';
import { NavLink, Outlet, ScrollRestoration, useNavigate } from 'react-router';
import { resonatorById } from '@/data/game';
import { elementColor } from '@/features/game/labels';
import { Button } from '@/ui/Button';
import { IconGear, IconGrid, IconLayers, IconPlus, IconWaves } from '@/ui/icons';
import { useBuilds, useInventory } from './services';
import styles from './AppShell.module.css';

const NAV = [
  { to: '/', label: 'Mes builds', icon: <IconGrid />, end: true },
  { to: '/echos', label: 'Échos', icon: <IconLayers />, end: false },
  { to: '/reglages', label: 'Réglages', icon: <IconGear />, end: false },
] as const;

export function AppShell() {
  const load = useBuilds((s) => s.load);
  const status = useBuilds((s) => s.status);
  const inventoryStatus = useInventory((s) => s.status);
  const loadInventory = useInventory((s) => s.load);
  const builds = useBuilds((s) => s.builds);
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);

  useEffect(() => {
    if (inventoryStatus === 'idle') void loadInventory();
  }, [inventoryStatus, loadInventory]);

  const recents = builds.slice(0, 5);

  return (
    <div className={styles.shell}>
      <a href="#contenu" className={styles.skip}>
        Aller au contenu
      </a>
      <nav aria-label="Navigation principale" className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            <IconWaves size={20} />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>Rivvu</span>
            <span className={styles.brandTag}>Builder Wuthering Waves</span>
          </span>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionTitle}>Bibliothèque</span>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={styles.navItem}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {recents.length > 0 ? (
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Récents</span>
            {recents.map((build) => {
              const resonator = resonatorById.get(build.resonatorId);
              return (
                <NavLink key={build.id} to={`/builds/${build.id}`} className={styles.recent}>
                  {resonator?.icon ? (
                    <img
                      src={resonator.icon}
                      alt=""
                      className={styles.avatar}
                      style={{ borderColor: elementColor(resonator.element) }}
                    />
                  ) : (
                    <span className={styles.avatar} />
                  )}
                  <span className={styles.recentText}>
                    <span className={styles.recentName}>{build.name}</span>
                    <span className="visually-hidden">, </span>
                    <span className={styles.recentDetail}>
                      {resonator?.name.fr ?? build.resonatorId}
                    </span>
                  </span>
                </NavLink>
              );
            })}
          </div>
        ) : null}

        <div className={styles.spacer} />
        <Button
          variant="filled"
          size="large"
          block
          icon={<IconPlus size={16} strokeWidth={2.4} />}
          onClick={() => {
            void navigate('/nouveau');
          }}
        >
          Nouveau build
        </Button>
      </nav>

      <main id="contenu" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <ScrollRestoration />

      <nav aria-label="Onglets" className={styles.tabBar}>
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={styles.tab}>
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
        <NavLink to="/nouveau" className={styles.tab}>
          <IconPlus />
          <span>Nouveau</span>
        </NavLink>
      </nav>
    </div>
  );
}
