// API configuration and utilities for backend communication
import { API_BASE_URL } from './config';

export interface ApiError {
  detail: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export type UserRole = 'User' | 'Admin';

export interface User {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  location?: string;
  payment_options?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  min_stock_level: number;
  created_at: string;
  category?: Category;
  category_id?: number;
  image_url?: string;
}

export interface ProductPaginatedResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CartItem {
  id: number;
  user_id: number;
  cart_id: number;
  product_id: number;
  quantity: number;
  created_at: string;
  product?: Product;
}

export interface OrderItem {
  id?: number;
  product_id: number;
  quantity: number;
  price: number;
  product?: Product;
}

export interface Order {
  id: number;
  amount: number;
  status: string;
  user_id?: number;
  created_at?: string;
  items?: OrderItem[];
}

export interface OrderCreationResponse {
  order_id: number;
  amount: number;
  status: string;
}

export interface PaymentResponse {
  order_id: number;
  payment_status: string;
  transaction_id: string;
}

class ApiClient {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async parseJson<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text);
  }

  private normalizeProduct(product: any): Product {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price ?? 0),
      stock: product.stock ?? product.stock_quantity ?? 0,
      min_stock_level: product.min_stock_level ?? 0,
      created_at: product.created_at ?? '',
      category_id: product.category_id ?? product.category?.id,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            description: product.category.description,
          }
        : undefined,
      image_url: product.image_url,
    };
  }

  private normalizeOrder(order: any): Order {
    return {
      id: order.id ?? order.order_id,
      amount: Number(order.amount ?? order.total_amount ?? 0),
      status: order.status,
      user_id: order.user_id,
      created_at: order.created_at,
      items: Array.isArray(order.items)
        ? order.items.map((item: any, index: number) => ({
            id: item.id ?? index,
            product_id: item.product_id,
            quantity: item.quantity,
            price: Number(item.price ?? 0),
            product: item.product ? this.normalizeProduct(item.product) : undefined,
          }))
        : undefined,
    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        const error: ApiError = await response
          .json()
          .catch(() => ({ detail: 'An error occurred' }));
        throw new Error(error.detail);
      }

      return this.parseJson<T>(response);
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
    location: string = '',
    paymentOptions: string = 'Card',
    role: UserRole = 'User'
  ): Promise<User> {
    return this.request<User>('/user/registration', {
      method: 'POST',
      body: JSON.stringify({
        username,
        email,
        password,
        location,
        payment_options: paymentOptions,
        role,
      }),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Product endpoints
  async getProducts(params: {
    page?: number;
    limit?: number;
    categoryId?: number;
    search?: string;
  } = {}): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.categoryId) query.set('category_id', String(params.categoryId));
    if (params.search) query.set('search', params.search);

    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await this.request<ProductPaginatedResponse>(`/products${suffix}`);
    return Array.isArray(response.products)
      ? response.products.map(this.normalizeProduct.bind(this))
      : [];
  }

  async getProduct(id: number): Promise<Product> {
    const product = await this.request<Product>(`/products/${id}`);
    return this.normalizeProduct(product);
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
    return this.request<CartItem>(`/cart/add?product_id=${productId}&quantity=${quantity}`, {
      method: 'POST',
    });
  }

  async updateCartItem(itemId: number, quantity: number): Promise<CartItem> {
    return this.request<CartItem>(`/cart/update?item_id=${itemId}&quantity=${quantity}`, {
      method: 'PUT',
    });
  }

  async removeFromCart(itemId: number, quantity: number = 1): Promise<void> {
    return this.request<void>(`/cart/remove/${itemId}?quantity=${quantity}`, {
      method: 'DELETE',
    });
  }

  // Order endpoints
  async getMyOrders(): Promise<Order[]> {
    const data = await this.request<any[]>('/orders/me');
    return data.map((order) => this.normalizeOrder(order));
  }

  async createOrder(): Promise<OrderCreationResponse> {
    const response = await this.request<OrderCreationResponse>('/orders', {
      method: 'POST',
    });
    return {
      order_id: response.order_id,
      amount: Number(response.amount ?? 0),
      status: response.status,
    };
  }

  async getOrder(id: number): Promise<Order> {
    const order = await this.request(`/orders/${id}`);
    return this.normalizeOrder(order);
  }

  // Payment endpoints
  async payOrder(orderId: number): Promise<PaymentResponse> {
    return this.request<PaymentResponse>(`/payments/${orderId}`, {
      method: 'POST',
    });
  }

  async getProductsByIds(ids: number[]): Promise<Map<number, Product>> {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const products = await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          return await this.getProduct(id);
        } catch {
          return null;
        }
      })
    );

    const productMap = new Map<number, Product>();
    products.forEach((product, index) => {
      if (product) {
        productMap.set(uniqueIds[index], product);
      }
    });

    return productMap;
  }
}

export const api = new ApiClient();
