import { useSettings } from '@/app/services';
import type { Theme } from '@/app/store/settings-store';
import { gameDataMeta } from '@/data/game';
import { Card } from '@/ui/Card';
import { GroupedList, ListRow } from '@/ui/GroupedList';
import { Page } from '@/ui/Page';
import { SegmentedControl } from '@/ui/SegmentedControl';
import styles from './SettingsPage.module.css';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

export function SettingsPage() {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const counts = gameDataMeta.counts;

  return (
    <Page title="Réglages">
      <Card heading="Apparence">
        <SegmentedControl<Theme>
          label="Thème"
          value={theme}
          onChange={setTheme}
          stretch
          options={[
            { value: 'system', label: 'Système' },
            { value: 'light', label: 'Clair' },
            { value: 'dark', label: 'Sombre' },
          ]}
        />
      </Card>

      <Card heading="Données du jeu">
        <GroupedList>
          <ListRow
            label="Mise à jour"
            trailing={dateFormatter.format(new Date(gameDataMeta.fetchedAt))}
          />
          <ListRow label="Résonateurs" trailing={String(counts.resonators ?? 0)} />
          <ListRow label="Armes" trailing={String(counts.weapons ?? 0)} />
          <ListRow label="Échos" trailing={String(counts.echoes ?? 0)} />
          <ListRow label="Ensembles de sonate" trailing={String(counts.sonatas ?? 0)} />
        </GroupedList>
      </Card>

      <Card heading="Stockage">
        <p className={styles.note}>
          Vos builds sont enregistrés sur cet appareil, dans ce navigateur. La synchronisation avec
          un compte arrivera dans une prochaine version.
        </p>
      </Card>

      <Card heading="Crédits">
        <p className={styles.note}>
          Données issues du <a href={gameDataMeta.url}>wiki Wuthering Waves</a> (CC BY-SA).
          Wuthering Waves, ses personnages et ses illustrations sont la propriété de Kuro Games.
          Rivvu est un projet de fan non affilié.
        </p>
      </Card>
    </Page>
  );
}
