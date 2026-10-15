import { commonsSearchUrl, mergePhotos, parseImageInfo, parsePageImage, photoCredit, plainText } from '../photos';

const info = (title: string, extra: Record<string, unknown> = {}, index = 1) => ({
  title,
  index,
  imageinfo: [
    {
      thumburl: `https://upload.wikimedia.org/thumb/${title}.jpg`,
      thumbwidth: 1000,
      thumbheight: 667,
      descriptionurl: `https://commons.wikimedia.org/wiki/${title}`,
      mime: 'image/jpeg',
      extmetadata: { Artist: { value: '<a href="//x">Ana Souza</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' } },
      ...extra,
    },
  ],
});

describe('fotos do Commons', () => {
  it('monta a busca com origem liberada para o app web', () => {
    const url = commonsSearchUrl('Torre de Belém Lisboa');
    expect(url).toContain('commons.wikimedia.org');
    expect(url).toContain('gsrsearch=Torre%20de%20Bel%C3%A9m%20Lisboa');
    expect(url).toContain('origin=*');
  });

  it('lê fotos com autor e licença e descarta ilustrações', () => {
    const photos = parseImageInfo({
      query: {
        pages: {
          '2': info('B', {}, 2),
          '1': info('A', {}, 1),
          '3': info('Mapa', { mime: 'image/svg+xml' }, 3),
          '4': info('SemLicenca', { extmetadata: {} }, 4),
          '5': info('Panorama', { thumbwidth: 1000, thumbheight: 200 }, 5),
        },
      },
    });
    expect(photos.map((p) => p.sourceUrl.split('/').pop())).toEqual(['A', 'B']);
    expect(photos[0].author).toBe('Ana Souza');
    expect(photoCredit(photos[0])).toBe('Foto: Ana Souza · CC BY-SA 4.0 · Wikimedia Commons');
    expect(parseImageInfo({})).toEqual([]);
  });

  it('junta sem repetir e limita a 6', () => {
    const a = parseImageInfo({ query: { pages: { '1': info('A') } } });
    const many = parseImageInfo({ query: { pages: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [String(i), info(`F${i}`, {}, i)])) } });
    const merged = mergePhotos(a, [...a, ...many]);
    expect(merged).toHaveLength(6);
    expect(merged[0].sourceUrl.endsWith('/A')).toBe(true);
  });

  it('lê a foto principal do artigo e limpa HTML', () => {
    expect(parsePageImage({ query: { pages: { '9': { pageimage: 'Belem_Tower.jpg' } } } })).toBe('Belem_Tower.jpg');
    expect(parsePageImage({ query: {} })).toBeNull();
    expect(plainText('<span>João &amp; Maria</span>\n')).toBe('João & Maria');
  });
});
