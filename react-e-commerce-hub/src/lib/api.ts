// API configuration and utilities for backend communication
import { API_BASE_URL } from './config';

export interface ApiError {
  detail: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  is_admin: boolean;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number | string;
  stock_quantity: number;
  category_id: number;
  image_url?: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  product?: Product;
}

export interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  product?: Product;
}

export interface ProductPaginatedResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

class ApiClient {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          detail: 'An error occurred',
        }));
        throw new Error(error.detail);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<LoginResponse> {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
  }

  async register(
    email: string,
    username: string,
    password: string,
    location: string = "",
    paymentOptions: string = "Card",
    role: string = "User"
  ): Promise<User> {
    return this.request<User>('/user/registration', {
      method: 'POST',
      body: JSON.stringify({
        username,
        email,
        password,
        location,
        payment_options: paymentOptions,
        role
      }),
    });
  }


  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Product endpoints
  async getProducts(page: number = 1, limit: number = 100): Promise<Product[]> {
    try {
      const response = await this.request<ProductPaginatedResponse>(
        `/products?page=${page}&limit=${limit}`
      );
      return Array.isArray(response.products) ? response.products : [];
    } catch (error) {
      console.error('Error in getProducts:', error);
      return [];
    }
  }

  async getProduct(id: number): Promise<Product> {
    return this.request<Product>(`/products/${id}`);
  }

  // Category endpoints
  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/categories');
  }

  // Cart endpoints
  async getCart(): Promise<CartItem[]> {
    return this.request<CartItem[]>('/cart/me');
  }

  async addToCart(productId: number, quantity: number = 1): Promise<CartItem> {
    return this.request<CartItem>('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity }),
    });
  }

  async updateCartItem(itemId: number, quantity: number): Promise<CartItem> {
    return this.request<CartItem>(`/cart/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  }

  async removeFromCart(itemId: number): Promise<void> {
    return this.request<void>(`/cart/${itemId}`, {
      method: 'DELETE',
    });
  }

  // Order endpoints
  async getOrders(): Promise<Order[]> {
    return this.request<Order[]>('/orders');
  }

  async createOrder(): Promise<Order> {
    return this.request<Order>('/orders', {
      method: 'POST',
    });
  }

  async getOrder(id: number): Promise<Order> {
    return this.request<Order>(`/orders/${id}`);
  }
}

export const api = new ApiClient();
