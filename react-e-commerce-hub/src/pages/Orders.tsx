import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, Order } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "Admin";

  const loadOrders = useCallback(async () => {
    if (!isAuthenticated) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // If admin, get all orders; otherwise get only user's orders
      const data = isAdmin ? await api.getAllOrders() : await api.getMyOrders();
      const productIds = data.flatMap((order) =>
        (order.items ?? []).map((item) => item.product_id)
      );
      const productMap = await api.getProductsByIds(productIds);
      const enrichedOrders = data.map((order) => ({
        ...order,
        items: (order.items ?? []).map((item) => ({
          ...item,
          product: productMap.get(item.product_id),
        })),
      }));
      setOrders(enrichedOrders);
    } catch (error) {
      console.error("Failed to load orders:", error);
      toast({
        title: "Failed to load orders",
        description:
          error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isAdmin, toast]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handlePay = async (orderId: number) => {
    try {
      await api.payOrder(orderId);
      toast({
        title: "Payment successful",
        description: `Order #${orderId} has been paid.`,
      });
      await loadOrders();
    } catch (error) {
      toast({
        title: "Payment failed",
        description:
          error instanceof Error ? error.message : "Unable to process payment.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "pending":
        return "bg-yellow-500";
      case "completed":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading || authLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-16">
        <Card className="max-w-md mx-auto text-center p-8">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Please sign in</h2>
          <p className="text-muted-foreground mb-6">
            Log in to view and manage your orders.
          </p>
          <Link to="/login">
            <Button>Sign In</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container py-16">
        <Card className="max-w-md mx-auto text-center p-8">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">
            {isAdmin ? "No orders found" : "No orders yet"}
          </h2>
          <p className="text-muted-foreground mb-6">
            {isAdmin
              ? "There are no orders in the system yet."
              : "When you place orders, they will appear here"}
          </p>
          {!isAdmin && (
            <Link to="/products">
              <Button>Start Shopping</Button>
            </Link>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-4xl font-bold mb-8">
        {isAdmin ? "All Orders" : "My Orders"}
      </h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                <Badge
                  className={`${getStatusColor(
                    order.status
                  )} text-white capitalize`}
                >
                  {order.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-2">
                {order.created_at && (
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
                {isAdmin && order.user_id && (
                  <p className="text-sm text-muted-foreground">
                    User ID: {order.user_id}
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {order.items?.map((item) => (
                  <div
                    key={item.id ?? `${order.id}-${item.product_id}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {item.product?.name ?? `Product #${item.product_id}`} x{" "}
                      {item.quantity}
                    </span>
                    <span className="font-semibold">
                      ${(Number(item.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex items-center justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">
                      ${Number(order.amount).toFixed(2)}
                    </span>
                  </div>
                  {order.status?.toLowerCase() === "pending" && !isAdmin && (
                    <Button
                      className="mt-4"
                      onClick={() => handlePay(order.id)}
                    >
                      Pay Now
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
