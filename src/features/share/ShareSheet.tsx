import { useEffect, useId, useState } from 'react';
import { encodeShare } from '@/app/share/share-codec';
import type { Build } from '@/domain/build';
import { slugify } from '@/lib/slug';
import { Button } from '@/ui/Button';
import { IconCopy, IconImage, IconShare } from '@/ui/icons';
import { Sheet } from '@/ui/Sheet';
import styles from './ShareSheet.module.css';

interface Props {
  build: Build;
  resonatorName: string;
  onClose: () => void;
}

/** Lien de partage (tout le build est dans l'URL) et export en image. */
export function ShareSheet({ build, resonatorName, onClose }: Props) {
  const inputId = useId();
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    void encodeShare(build).then((code) => {
      if (active) setUrl(`${window.location.origin}/partage#${code}`);
    });
    return () => {
      active = false;
    };
  }, [build]);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setStatus('Lien copié dans le presse-papiers.');
    } catch {
      setStatus('Copie impossible : sélectionnez le lien et copiez-le.');
    }
  };

  const nativeShare = async () => {
    if (!url) return;
    try {
      await navigator.share({ title: `${resonatorName} — ${build.name}`, url });
    } catch {
      // Partage annulé par l'utilisateur : rien à signaler.
    }
  };

  const exportImage = async () => {
    setExporting(true);
    setStatus('Préparation de l’image…');
    try {
      const [{ buildCardModel }, { renderBuildCard, downloadBlob }] = await Promise.all([
        import('./build-card'),
        import('./draw-build-card'),
      ]);
      const model = buildCardModel(build);
      if (!model) throw new Error('Résonateur inconnu');
      downloadBlob(
        await renderBuildCard(model),
        `rivvu-${slugify(resonatorName)}-${slugify(build.name) || 'build'}.png`,
      );
      setStatus('Image exportée.');
    } catch {
      setStatus('L’export en image a échoué.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Sheet title="Partager ce build" onClose={onClose}>
      <div className={styles.body}>
        <label htmlFor={inputId} className={styles.label}>
          Lien du build
        </label>
        <input
          id={inputId}
          className={styles.link}
          readOnly
          value={url ?? 'Création du lien…'}
          onFocus={(event) => {
            event.currentTarget.select();
          }}
        />
        <p className={styles.hint}>
          Tout le build est contenu dans le lien : rien n’est envoyé à un serveur. La personne qui
          l’ouvre peut le consulter puis l’ajouter à ses builds.
        </p>
        <div className={styles.actions}>
          <Button
            variant="filled"
            icon={<IconCopy size={16} />}
            disabled={!url}
            onClick={() => void copy()}
          >
            Copier le lien
          </Button>
          {'share' in navigator ? (
            <Button
              variant="tinted"
              icon={<IconShare size={16} />}
              disabled={!url}
              onClick={() => void nativeShare()}
            >
              Partager…
            </Button>
          ) : null}
          <Button
            variant="gray"
            icon={<IconImage size={16} />}
            disabled={exporting}
            onClick={() => void exportImage()}
          >
            Exporter en image
          </Button>
        </div>
        <p role="status" className={styles.status}>
          {status}
        </p>
      </div>
    </Sheet>
  );
}
