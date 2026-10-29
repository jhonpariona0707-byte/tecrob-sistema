import { buildCsvContent } from './csv-export';

describe('buildCsvContent', () => {
  it('quotes values containing separators and escapes embedded quotes', () => {
    expect(buildCsvContent(['Producto', 'Nota'], [['Memoria RAM', 'Dice "rápido"; revisar']]))
      .toBe('"Producto";"Nota"\r\n"Memoria RAM";"Dice ""rápido""; revisar"');
  });

  it('protects spreadsheet formula values while preserving numbers', () => {
    expect(buildCsvContent(['Nombre', 'Cantidad'], [['=HYPERLINK("x")', -4]]))
      .toBe('"Nombre";"Cantidad"\r\n"\'=HYPERLINK(""x"")";"-4"');
  });

  it('produces headers for an empty report', () => {
    expect(buildCsvContent(['Código', 'Stock'], []))
      .toBe('"Código";"Stock"');
  });
});
