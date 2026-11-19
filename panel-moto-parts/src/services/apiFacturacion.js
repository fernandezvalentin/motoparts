import { API_URL, getHeaders } from './api';

export const apiFacturacion = {
  getAll: async () => {
    const res = await fetch(`${API_URL}/facturacion`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al obtener facturas');
    return res.json();
  },

  uploadPdf: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Obtenemos los headers, pero eliminamos 'Content-Type' para que el navegador 
    // establezca el boundary automáticamente para el form-data
    const headers = getHeaders();
    delete headers['Content-Type'];

    const res = await fetch(`${API_URL}/facturacion/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error('Error al procesar el PDF');
    return res.json();
  },

  create: async (data) => {
    const res = await fetch(`${API_URL}/facturacion`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al guardar la factura');
    return res.json();
  },

  updateEstado: async (id, estado) => {
    const res = await fetch(`${API_URL}/facturacion/${id}/estado`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ estado }),
    });
    if (!res.ok) throw new Error('Error al actualizar el estado');
    return res.json();
  },

  delete: async (id) => {
    const res = await fetch(`${API_URL}/facturacion/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Error al eliminar factura');
  }
};
