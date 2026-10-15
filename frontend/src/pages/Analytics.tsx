import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface Summary {
  total_revenue: number;
  total_orders: number;
  total_products: number;
  total_customers: number;
  avg_order_value: number;
}

interface SalesPoint {
  period: string;
  revenue: number;
  orders: number;
}

interface BestSeller {
  id: number;
  name: string;
  units_sold: number;
  revenue: number;
}

interface UnsoldProduct {
  id: number;
  name: string;
  stock: number;
  category: string | null;
}

interface RecentOrder {
  order_id: number;
  customer: string;
  status: string;
  amount: number;
  created_at: string;
}

export default function Analytics() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "Admin";

  const [summary, setSummary] = useState<Summary | null>(null);
  const [sales, setSales] = useState<SalesPoint[]>([]);
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([]);
  const [unsold, setUnsold] = useState<UnsoldProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
      return;
    }
    if (!isAdmin) return;
    Promise.all([
      api.getAnalyticsSummary(),
      api.getAnalyticsSalesOverTime(),
      api.getAnalyticsBestSellers(),
      api.getAnalyticsUnsoldProducts(),
      api.getAnalyticsRecentOrders(),
    ])
      .then(([s, so, bs, up, ro]) => {
        setSummary(s);
        setSales(so);
        setBestSellers(bs);
        setUnsold(up);
        setRecentOrders(ro);
      })
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin, navigate]);

  if (authLoading || loading) {
    return (
      <div className="container py-8 space-y-4 animate-pulse">
        <div className="h-10 w-48 rounded bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded bg-muted" />
          ))}
        </div>
        <div className="h-64 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Store Analytics</h1>
        <p className="text-muted-foreground">Business performance overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `$${(summary?.total_revenue ?? 0).toFixed(2)}` },
          { label: "Total Orders", value: summary?.total_orders ?? 0 },
          { label: "Avg Order Value", value: `$${(summary?.avg_order_value ?? 0).toFixed(2)}` },
          { label: "Customers", value: summary?.total_customers ?? 0 },
        ].map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue — Last 12 Months</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={sales}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Orders Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Orders — Last 12 Months</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={sales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Best Sellers */}
        <Card>
          <CardHeader>
            <CardTitle>Best Sellers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bestSellers.length === 0 && (
              <p className="text-sm text-muted-foreground">No sales yet.</p>
            )}
            {bestSellers.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <span className="font-semibold mr-2">#{i + 1}</span>
                  {p.name}
                </div>
                <div className="text-right text-sm">
                  <span className="font-medium">{p.units_sold}</span>
                  <span className="text-muted-foreground"> sold · ${p.revenue.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Unsold Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Unsold Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unsold.length === 0 && (
              <p className="text-sm text-muted-foreground">All products have sales.</p>
            )}
            {unsold.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">{p.name}</p>
                  {p.category && (
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">Stock: {p.stock}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Order</th>
                  <th className="text-left py-2">Customer</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-right py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.order_id} className="border-b">
                    <td className="py-2">#{o.order_id}</td>
                    <td className="py-2">{o.customer}</td>
                    <td className="py-2">
                      <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2 text-right">${o.amount.toFixed(2)}</td>
                    <td className="py-2 text-right text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
