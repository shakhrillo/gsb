import axios from 'axios';
import { API_URL } from '@/constants';

export const getProducts = async (merchantUid: string): Promise<any[]> => {
  try {
    const response = await axios.get<any[]>(`${API_URL}/api/products?merchantUid=${merchantUid}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

export const getMerchants = async (): Promise<any[]> => {
  try {
    const response = await axios.get<any[]>(`${API_URL}/api/merchants`);
    return response.data;
  } catch (error) {
    console.error('Error fetching merchants:', error);
    throw error;
  }
}