// src/components/StockBadge.jsx

export function StockBadge({ stockActual, stockMinimo }) {
  let status, label, dotColor;

  if (stockActual <= 0) {
    status = "danger";
    label = "Sin stock";
    dotColor = "var(--danger)";
  } else if (stockActual <= stockMinimo) {
    status = "danger";
    label = "Crítico";
    dotColor = "var(--danger)";
  } else if (stockActual <= stockMinimo * 2) {
    status = "warning";
    label = "Bajo";
    dotColor = "var(--warning)";
  } else {
    status = "success";
    label = "OK";
    dotColor = "var(--success)";
  }

  return (
    <span className={`badge badge-${status}`}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: dotColor,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
