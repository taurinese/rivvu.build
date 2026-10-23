import { describe, expect, it } from 'vitest';
import {
  findTemplate,
  firstImageName,
  otherLanguage,
  parseTemplateParams,
  wikiToText,
} from './wikitext';

describe('findTemplate', () => {
  it('extrait un modèle même avec des modèles et liens imbriqués', () => {
    const src = `intro {{Echo Infobox\n|name=Carapace\n|effect= deals {{Color|[[Aero]] DMG}}.\n}} outro {{Other}}`;
    expect(findTemplate(src, 'Echo Infobox')).toBe(
      '{{Echo Infobox\n|name=Carapace\n|effect= deals {{Color|[[Aero]] DMG}}.\n}}',
    );
  });

  it('ignore la casse et les espaces/underscores du nom', () => {
    expect(findTemplate('{{weapon_infobox|a=1}}', 'Weapon Infobox')).toBe('{{weapon_infobox|a=1}}');
  });

  it('renvoie null si le modèle est absent', () => {
    expect(findTemplate('rien', 'Echo Infobox')).toBeNull();
  });
});

describe('parseTemplateParams', () => {
  it('sépare les paramètres nommés sans couper dans les modèles ou liens imbriqués', () => {
    const params = parseTemplateParams(
      '{{Sonata Infobox\n|title = Sierra Gale\n|2pc = {{Color|[[Aero]] DMG|nobold=1}} +10%.\n|link=[[Intro Skill|Intro]]\n}}',
    );
    expect(params).toEqual({
      title: 'Sierra Gale',
      '2pc': '{{Color|[[Aero]] DMG|nobold=1}} +10%.',
      link: '[[Intro Skill|Intro]]',
    });
  });

  it('numérote les paramètres positionnels', () => {
    expect(parseTemplateParams('{{Other Languages|Carapace}}')).toEqual({ '1': 'Carapace' });
  });
});

describe('wikiToText', () => {
  it('retire les commentaires et balises même imbriqués ou reformés après un premier passage', () => {
    expect(wikiToText('Jiyan<!-<!-- x -->- y -->')).toBe('Jiyan');
    expect(wikiToText('a<scr<b>ipt>b')).toBe('ab');
    expect(wikiToText('<<b>i>gras</<b>i>')).toBe('gras');
  });

  it('rend le texte lisible : couleurs, liens, retours à la ligne, gras', () => {
    expect(
      wikiToText(
        "{{Color|[[Aero]] DMG|nobold=1}} +30% after [[Intro Skill|Intro]].<br/>'''Bold''' {{color|help|Qingloong Mode}}",
      ),
    ).toBe('Aero DMG +30% after Intro.\nBold Qingloong Mode');
  });

  it('décode les entités HTML courantes', () => {
    expect(wikiToText('Broadblade&shy;#41 &mdash; A&amp;B&nbsp;C')).toBe('Broadblade#41 — A&B C');
  });

  it('supprime les références et commentaires', () => {
    expect(wikiToText('Texte<ref name="x">source</ref><!-- note --> fin')).toBe('Texte fin');
  });
});

describe('firstImageName', () => {
  it('lit un nom de fichier simple ou la première image d’une galerie', () => {
    expect(firstImageName('Weapon Verdant Summit.png')).toBe('Weapon Verdant Summit.png');
    expect(
      firstImageName('<gallery>\nReminiscence Kronaclaw Icon.png|Normal\nB.png|Alt\n</gallery>'),
    ).toBe('Reminiscence Kronaclaw Icon.png');
    expect(firstImageName('')).toBe('');
  });
});

describe('otherLanguage', () => {
  it('lit la traduction simple ou numérotée', () => {
    const page =
      '{{Other Languages\n|en = Verdant Summit\n|1_fr   = Sommet verdoyant\n|fr = Autre\n}}';
    expect(otherLanguage(page, 'fr')).toBe('Autre');
    expect(otherLanguage('{{Other Languages\n|1_fr = Sommet verdoyant\n}}', 'fr')).toBe(
      'Sommet verdoyant',
    );
    expect(otherLanguage('{{Other Languages|Carapace}}', 'fr')).toBeNull();
  });
});
