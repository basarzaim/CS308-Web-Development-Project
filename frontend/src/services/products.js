// src/services/products.js
import { api } from "../api/client";


export const getProducts = async (params = {}) => {
  const response = await api.get('/products/', { params });
  return response.data;
};


export const getProductDetail = async (id) => {
  const response = await api.get(`/products/${id}/`);
  return response.data;
};
