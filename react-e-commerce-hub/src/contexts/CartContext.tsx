import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, CartItem } from '@/lib/api';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CartContextType {
  cart: CartItem[];
  loading: boolean;
  addToCart: (productId: number, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number, quantity: number) => Promise<void>;
  refreshCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      refreshCart();
    } else {
      setCart([]);
    }
  }, [isAuthenticated, isAdmin]);

  const refreshCart = async () => {
    if (!isAuthenticated || isAdmin) return;
    
    try {
      setLoading(true);
      const cartData = await api.getCart();
      const productIds = cartData.map((item) => item.product_id);
      const productMap = cartData.length
        ? await api.getProductsByIds(productIds)
        : new Map();
      const enrichedCart = cartData.map((item) => ({
        ...item,
        product: productMap.get(item.product_id),
      }));
      setCart(enrichedCart);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId: number, quantity: number = 1) => {
    try {
      await api.addToCart(productId, quantity);
      await refreshCart();
      toast({
        title: 'Added to cart',
        description: 'Product has been added to your cart.',
      });
    } catch (error) {
      toast({
        title: 'Failed to add to cart',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    try {
      await api.updateCartItem(itemId, quantity);
      await refreshCart();
    } catch (error) {
      toast({
        title: 'Failed to update cart',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const removeItem = async (itemId: number, quantity: number) => {
    try {
      await api.removeFromCart(itemId, quantity);
      await refreshCart();
      toast({
        title: 'Removed from cart',
        description: 'Product has been removed from your cart.',
      });
    } catch (error) {
      toast({
        title: 'Failed to remove item',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce(
    (sum, item) => sum + Number(item.product?.price ?? 0) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        addToCart,
        updateQuantity,
        removeItem,
        refreshCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
