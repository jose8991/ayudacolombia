import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axe from 'axe-core';
import { afterEach, expect, it, vi } from 'vitest';
import { HomePage } from '../src/pages/home';

vi.mock('../src/widgets/emergency-map', () => ({
  EmergencyMap: ({ region }: { region: { name: string } }) => (
    <div role="region" aria-label={'Mapa humanitario interactivo de ' + region.name} />
  ),
}));

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

function renderHome() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>,
  );
}

async function expectNoAutomaticAccessibilityViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });
  expect(
    results.violations,
    results.violations.map((item) => `${item.id}: ${item.help}`).join('\n'),
  ).toEqual([]);
}

function openCentersMap() {
  // The map is visible by default; this helper keeps map-focused tests readable.
}

it('empieza con decisiones claras y el mapa visible', async () => {
  renderHome();
  expect(screen.getByRole('heading', { name: '¿Qué necesitas?' })).toBeVisible();
  expect(
    await screen.findByRole('region', { name: /mapa humanitario interactivo de Pereira/i }),
  ).toBeVisible();
});

it('abre directamente el mapa cuando llega un enlace territorial compartido', async () => {
  window.history.replaceState({}, '', '/?region=co-ris-pereira&comuna=Centro');
  renderHome();
  expect(
    await screen.findByRole('region', { name: /mapa humanitario interactivo de Pereira/i }),
  ).toBeVisible();
});

it('muestra el mapa desde el inicio en una pantalla de escritorio', async () => {
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(min-width: 901px)',
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  try {
    renderHome();
    expect(
      await screen.findByRole('region', { name: /mapa humanitario interactivo de Pereira/i }),
    ).toBeVisible();
  } finally {
    window.matchMedia = originalMatchMedia;
  }
});

it('permite cambiar lo que muestra el mapa', async () => {
  renderHome();
  fireEvent.click(screen.getByText('Qué mostrar'));
  // Todas las capas empiezan encendidas: si el contador anuncia algo, el mapa lo muestra.
  const needs = screen.getByRole('button', { name: /^Necesidades/i });
  expect(needs).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(needs);
  expect(needs).toHaveAttribute('aria-pressed', 'false');
});

it('muestra acciones funcionales', () => {
  renderHome();
  expect(screen.getByRole('button', { name: /^Necesito ayuda/ })).toBeVisible();
  expect(screen.getByRole('button', { name: /^Quiero ayudar/ })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /^Quiero ayudar/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Ofrecer ayuda/ }));
  expect(screen.getByRole('heading', { name: 'Publica lo que puedes dar' })).toBeVisible();
  expect(screen.getByLabelText(/¿Cuánto y hasta cuándo?/i)).toBeVisible();
});

it('permite cambiar a Dosquebradas desde el filtro de municipio', async () => {
  renderHome();
  openCentersMap();
  fireEvent.click(screen.getByRole('button', { name: /Municipio Pereira/i }));
  fireEvent.click(await screen.findByRole('button', { name: /Dosquebradas/i }));
  expect(
    await screen.findByRole('region', { name: /mapa humanitario interactivo de Dosquebradas/i }),
  ).toBeVisible();
  expect(screen.getByRole('combobox', { name: 'Seleccionar zona' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Municipio Dosquebradas/i }));
  fireEvent.click(await screen.findByRole('button', { name: /^Pereira/i }));
  expect(
    await screen.findByRole('region', { name: /mapa humanitario interactivo de Pereira/i }),
  ).toBeVisible();
});

it('cierra el selector territorial con Escape y devuelve el foco', async () => {
  renderHome();
  const trigger = screen.getByRole('button', { name: /Municipio Pereira/i });
  fireEvent.click(trigger);
  expect(screen.getByRole('dialog', { name: /¿Dónde necesitas ayuda?/i })).toBeVisible();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(
    screen.queryByRole('dialog', { name: /¿Dónde necesitas ayuda?/i }),
  ).not.toBeInTheDocument();
  await waitFor(() => expect(trigger).toHaveFocus());
});

it('permite quedarse solo con lo confirmado sin explicarlo dos veces', () => {
  renderHome();
  openCentersMap();
  const soloConfirmado = screen.getByRole('checkbox', { name: /Ver solo información confirmada/i });
  expect(soloConfirmado).not.toBeChecked();
  fireEvent.click(soloConfirmado);
  expect(soloConfirmado).toBeChecked();
  expect(screen.queryByText('De dónde viene la información')).not.toBeInTheDocument();
});

it('muestra acciones con una explicación clara', () => {
  renderHome();
  expect(screen.getByText(/Agua, comida, salud o dónde dormir/i)).toBeVisible();
  expect(screen.getByRole('button', { name: /^Reportar/ })).toBeVisible();
  expect(screen.getByText(/Un daño, un albergue o dónde necesitan ayuda/i)).toBeVisible();
});

it('permite consultar las ayudas ofrecidas desde Quiero ayudar', () => {
  renderHome();
  fireEvent.click(screen.getByRole('button', { name: /^Quiero ayudar/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Ver ayudas ofrecidas' }));
  fireEvent.click(screen.getByText('Qué mostrar'));
  expect(screen.getByRole('button', { name: /^Ayudas ofrecidas/i })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

it('reserva Reportar para lugares y problemas', () => {
  renderHome();
  fireEvent.click(screen.getByRole('button', { name: /^Reportar/ }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('heading', { name: '¿Qué quieres reportar?' })).toBeVisible();
  expect(within(dialog).getByRole('button', { name: /^Un lugar de ayuda/ })).toBeVisible();
  expect(within(dialog).getByRole('button', { name: /^Un daño o una vía cerrada/ })).toBeVisible();
  expect(within(dialog).queryByRole('button', { name: /^Necesito ayuda/ })).not.toBeInTheDocument();
  expect(within(dialog).queryByRole('button', { name: /^Ofrezco ayuda/ })).not.toBeInTheDocument();
});

it('no presenta ceros como si fueran datos confirmados', () => {
  renderHome();
  fireEvent.click(screen.getByRole('button', { name: /^Necesito ayuda/ }));
  expect(screen.getByRole('heading', { name: '¿Qué buscas?' })).toBeVisible();
  expect(screen.queryByText('0 necesidades')).not.toBeInTheDocument();
  expect(screen.getAllByText(/Consultando información|Todavía no hay/i).length).toBeGreaterThan(0);
});

it('separa la solicitud privada de la consulta pública', () => {
  renderHome();
  fireEvent.click(screen.getByRole('button', { name: /^Necesito ayuda/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Pedir ayuda/ }));
  expect(screen.getByRole('heading', { name: 'Dinos 3 cosas' })).toBeVisible();
  expect(screen.getByLabelText('¿Qué necesitas?')).toBeVisible();
  expect(screen.getByLabelText(/Tu teléfono/i)).toBeVisible();
  expect(screen.getByText(/no aparecerán en el mapa/i)).toBeVisible();
});

it('permite revisar y editar una solicitud antes de enviarla', () => {
  renderHome();
  fireEvent.click(screen.getByRole('button', { name: /^Necesito ayuda/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Pedir ayuda/ }));
  fireEvent.change(screen.getByLabelText(/¿Cuántas personas?/i), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText(/¿En qué barrio o vereda?/i), {
    target: { value: 'Cuba' },
  });
  fireEvent.change(screen.getByLabelText(/¿Qué está pasando?/i), {
    target: { value: 'Necesitamos alimentos para hoy' },
  });
  fireEvent.change(screen.getByLabelText(/Tu teléfono/i), {
    target: { value: '3001234567' },
  });
  fireEvent.click(screen.getByRole('checkbox', { name: /Acepto que TIMELIBER S\.A\.S\./i }));
  fireEvent.click(screen.getByRole('button', { name: 'Ver y enviar' }));
  expect(screen.getByRole('heading', { name: 'Revisa y envía' })).toBeVisible();
  expect(screen.getByText('Necesitamos alimentos para hoy')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  expect(screen.getByDisplayValue('Necesitamos alimentos para hoy')).toBeVisible();
});

it('no presenta violaciones WCAG automáticas en la portada', async () => {
  const { container } = renderHome();
  await screen.findByRole('region', { name: /mapa humanitario interactivo de Pereira/i });
  await expectNoAutomaticAccessibilityViolations(container);
});

it('mantiene accesibles los recorridos principales', async () => {
  const { container } = renderHome();
  for (const action of [/^Necesito ayuda/, /^Quiero ayudar/, /^Reportar/]) {
    fireEvent.click(screen.getByRole('button', { name: action }));
    expect(screen.getByRole('dialog')).toBeVisible();
    await expectNoAutomaticAccessibilityViolations(container);
    fireEvent.click(screen.getByRole('button', { name: /^Volver/ }));
  }
});

it('exige un teléfono a quien se ofrece: una oferta sin contacto no se puede coordinar', () => {
  renderHome();
  fireEvent.click(screen.getByRole('button', { name: /^Quiero ayudar/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Ofrecer ayuda/ }));
  const phone = screen.getByLabelText(/Tu teléfono/i);
  expect(phone).toBeVisible();
  expect(phone).toBeRequired();
  expect(screen.getByText(/No aparece en el mapa/i)).toBeVisible();
});

it('recuerda el código de seguimiento para no exigir memoria', () => {
  localStorage.setItem(
    'sos.last-tracking-code',
    JSON.stringify({ code: 'SOS-ABC1234567', kind: 'report' }),
  );
  renderHome();
  fireEvent.click(screen.getByRole('button', { name: /^Reportar/ }));
  fireEvent.click(screen.getByText('Ver cómo va lo que enviaste'));
  expect(screen.getByText('SOS-ABC1234567')).toBeVisible();
  expect(screen.getByLabelText('Código')).toHaveValue('SOS-ABC1234567');
  localStorage.clear();
});

it('ofrece las líneas oficiales de cada municipio para llamar', async () => {
  renderHome();
  fireEvent.click(screen.getByRole('button', { name: /^Necesito ayuda/ }));
  fireEvent.click(screen.getByText('Líneas oficiales para llamar'));
  expect(screen.getByRole('link', { name: /Emergencias 123/ })).toHaveAttribute('href', 'tel:123');
  expect(screen.getByRole('link', { name: /Bomberos 119/ })).toBeVisible();
  expect(screen.getByRole('link', { name: /Alcaldía de Pereira/ })).toBeVisible();
  expect(screen.queryByRole('link', { name: /DIGER Dosquebradas/ })).not.toBeInTheDocument();
});

it('ofrece ordenar por cercanía y avisa si no puede ubicar a la persona', async () => {
  const getCurrentPosition = vi.fn((_success, failure) => failure(new Error('denegado')));
  vi.stubGlobal('navigator', { ...window.navigator, geolocation: { getCurrentPosition } });
  renderHome();
  openCentersMap();
  const button = screen.getByRole('button', { name: /Ver lo más cerca de mí/i });
  expect(button).toBeVisible();
  fireEvent.click(button);
  expect(await screen.findByText(/No pudimos ubicarte/i)).toBeVisible();
  vi.unstubAllGlobals();
});

it('explica en el mapa qué significa cada símbolo y cada nivel', async () => {
  renderHome();
  openCentersMap();
  fireEvent.click(screen.getByText('Qué significa cada símbolo'));
  const leyenda = within(screen.getByText('Qué significa cada símbolo').closest('details')!);
  expect(leyenda.getByText('Aquí hay ayuda')).toBeVisible();
  expect(leyenda.getByText('Aquí la necesitan')).toBeVisible();
  expect(leyenda.getByText('Confirmado por una entidad')).toBeVisible();
  expect(leyenda.getByText('Sin confirmar')).toBeVisible();
  expect(leyenda.getByText('Ya no recibe gente')).toBeVisible();
  expect(leyenda.getByText('Puede estar desactualizado')).toBeVisible();
});

it('ofrecer ayuda es tocar lo que se puede dar, no escribir un resumen', () => {
  renderHome();
  fireEvent.click(screen.getByRole('button', { name: /^Quiero ayudar/ }));
  const opciones = within(screen.getByRole('dialog')).getAllByRole('button');
  expect(opciones[1]).toHaveTextContent('Ofrecer ayuda');

  fireEvent.click(screen.getByRole('button', { name: /^Ofrecer ayuda/ }));
  expect(screen.getByRole('group', { name: '¿Qué puedes dar?' })).toBeVisible();
  for (const opcion of ['Transporte', 'Comida', 'Agua', 'Alojamiento']) {
    expect(screen.getByRole('radio', { name: opcion })).toBeVisible();
  }
  expect(screen.queryByLabelText('Resumen')).not.toBeInTheDocument();
});

it('publica una oferta sin pasar por una pantalla de revisión', () => {
  renderHome();
  fireEvent.click(screen.getByRole('button', { name: /^Quiero ayudar/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Ofrecer ayuda/ }));
  fireEvent.click(screen.getByRole('radio', { name: 'Transporte' }));
  fireEvent.change(screen.getByLabelText(/¿Cuánto y hasta cuándo?/i), {
    target: { value: 'Camioneta disponible hoy hasta las 6' },
  });
  fireEvent.click(screen.getByRole('checkbox', { name: /Acepto que TIMELIBER S\.A\.S\./i }));
  fireEvent.click(screen.getByRole('button', { name: 'Ver y enviar' }));
  expect(screen.queryByRole('heading', { name: 'Revisa y envía' })).not.toBeInTheDocument();
});

it('permite avisar que en un lugar necesitan ayuda, sin que sea una solicitud propia', () => {
  renderHome();
  fireEvent.click(screen.getByRole('button', { name: /^Reportar/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Aquí necesitan ayuda/ }));
  expect(screen.getByRole('group', { name: '¿Qué hace falta?' })).toBeVisible();
  expect(screen.getByRole('radio', { name: 'Agua' })).toBeVisible();
  expect(screen.getByLabelText(/¿En qué barrio o vereda?/i)).toBeRequired();
  expect(screen.getByLabelText(/Tu teléfono/i)).not.toBeRequired();
  expect(screen.getByText(/solo para coordinar esta ayuda/i)).toBeVisible();
});

it('ofrece otros sitios cuando aquí no hay lo que la persona busca', () => {
  renderHome();
  fireEvent.click(screen.getByRole('button', { name: /^Necesito ayuda/ }));
  fireEvent.click(screen.getByText('Otros sitios que pueden ayudarte'));
  const panel = within(screen.getByText('Otros sitios que pueden ayudarte').closest('details')!);
  const ayudasPereira = panel.getByRole('link', { name: 'Ayudas Pereira' });
  expect(ayudasPereira).toHaveAttribute('href', 'https://alluda.online/');
  expect(ayudasPereira).toHaveAttribute('target', '_blank');
  expect(panel.getByRole('link', { name: 'Mapa del terremoto' })).toBeVisible();
  // Y también donde más falta hacen: cuando la lista de aquí está vacía.
  expect(screen.getAllByRole('link', { name: 'Ayudas Pereira' }).length).toBeGreaterThan(1);
});
