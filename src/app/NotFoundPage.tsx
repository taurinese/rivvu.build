import { ButtonLink } from '@/ui/Button';
import { Page } from '@/ui/Page';

export function NotFoundPage({ message = 'Cette page n’existe pas.' }: { message?: string }) {
  return (
    <Page title="Introuvable" subtitle={message}>
      <div>
        <ButtonLink to="/" variant="filled">
          Retour à mes builds
        </ButtonLink>
      </div>
    </Page>
  );
}
