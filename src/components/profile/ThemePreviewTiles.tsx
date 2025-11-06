const tiles = [
  { title: "Cards", preview: "card" as const },
  { title: "Tabla", preview: "table" as const },
  { title: "Botón primario", preview: "button" as const },
  { title: "Gráfica", preview: "chart" as const },
];

type PreviewType = (typeof tiles)[number]["preview"];

const renderPreview = (type: PreviewType) => {
  switch (type) {
    case "card":
      return (
        <div className="theme-preview-card">
          <span className="theme-preview-badge">Ingresos</span>
          <h4 className="theme-preview-title">$125,450</h4>
          <p className="theme-preview-subtitle">Últimos 30 días</p>
        </div>
      );
    case "table":
      return (
        <div className="theme-preview-table">
          <div className="theme-preview-table-header">
            <span>Fecha</span>
            <span>Concepto</span>
            <span>Monto</span>
          </div>
          <div className="theme-preview-table-row">
            <span>05 Jun</span>
            <span>Pago de cliente</span>
            <span className="positive">+$8,400</span>
          </div>
          <div className="theme-preview-table-row">
            <span>03 Jun</span>
            <span>Servicios legales</span>
            <span className="negative">-$2,100</span>
          </div>
        </div>
      );
    case "button":
      return (
        <div className="theme-preview-button-wrapper">
          <button className="theme-preview-button">Nuevo registro</button>
          <a className="theme-preview-link" href="#">
            Ver historial
          </a>
        </div>
      );
    case "chart":
      return (
        <div className="theme-preview-chart">
          <div className="bar bar-1" />
          <div className="bar bar-2" />
          <div className="bar bar-3" />
          <div className="bar bar-4" />
          <div className="bar bar-5" />
        </div>
      );
    default:
      return null;
  }
};

export const ThemePreviewTiles = () => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Vista previa</h3>
        <p className="text-sm text-muted-foreground">
          Observa cómo se adapta la interfaz en diferentes componentes clave.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {tiles.map((tile) => (
          <div key={tile.title} className="theme-preview-tile">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-muted-foreground">{tile.title}</span>
            </div>
            {renderPreview(tile.preview)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThemePreviewTiles;
