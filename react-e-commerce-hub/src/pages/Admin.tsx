import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Category, CategoryInput, Product, ProductInput } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ProductFormState {
  name: string;
  description: string;
  price: string;
  stock: string;
  min_stock_level: string;
  category_id: string;
}

const defaultProductForm: ProductFormState = {
  name: "",
  description: "",
  price: "",
  stock: "",
  min_stock_level: "",
  category_id: "",
};

export default function Admin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryForm, setCategoryForm] = useState<CategoryInput>({
    name: "",
    description: "",
  });
  const [productForm, setProductForm] =
    useState<ProductFormState>(defaultProductForm);
  const [submitting, setSubmitting] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const isAdmin = useMemo(() => user?.role === "Admin", [user]);

  const loadData = useCallback(async () => {
    try {
      setInitializing(true);
      const [productData, categoryData] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
      ]);
      setProducts(productData);
      setCategories(categoryData);
    } catch (error) {
      toast({
        title: "Failed to load admin data",
        description:
          error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setInitializing(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!loading) {
      if (!isAdmin) {
        navigate("/");
        return;
      }
      loadData();
    }
  }, [loading, isAdmin, loadData, navigate]);

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      toast({
        title: "Validation",
        description: "Category name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await api.createCategory(categoryForm);
      toast({ title: "Category created" });
      setCategoryForm({ name: "", description: "" });
      await loadData();
    } catch (error) {
      toast({
        title: "Could not create category",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.category_id) {
      toast({
        title: "Validation",
        description: "Name and category are required.",
        variant: "destructive",
      });
      return;
    }

    const payload: ProductInput = {
      name: productForm.name,
      description: productForm.description,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      min_stock_level: Number(productForm.min_stock_level),
      category_id: Number(productForm.category_id),
    };

    try {
      setSubmitting(true);
      await api.createProduct(payload);
      toast({ title: "Product created" });
      setProductForm(defaultProductForm);
      await loadData();
    } catch (error) {
      toast({
        title: "Could not create product",
        description:
          error instanceof Error ? error.message : "Please verify the data.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      await api.deleteProduct(id);
      toast({ title: "Product deleted" });
      await loadData();
    } catch (error) {
      toast({
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Unable to delete product.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await api.deleteCategory(id);
      toast({ title: "Category deleted" });
      await loadData();
    } catch (error) {
      toast({
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Unable to delete category.",
        variant: "destructive",
      });
    }
  };

  if (loading || initializing) {
    return (
      <div className="container py-8">
        <div className="space-y-4 animate-pulse">
          <div className="h-10 w-40 rounded bg-muted" />
          <div className="h-64 rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Admin Control Center</h1>
        <p className="text-muted-foreground">
          Manage products and categories available to shoppers.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Category</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCategorySubmit}>
              <div className="space-y-2">
                <Label htmlFor="category-name">Name</Label>
                <Input
                  id="category-name"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-description">Description</Label>
                <Textarea
                  id="category-description"
                  value={categoryForm.description ?? ""}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Optional"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                Add Category
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Product</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleProductSubmit}>
              <div className="space-y-2">
                <Label htmlFor="product-name">Name</Label>
                <Input
                  id="product-name"
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-description">Description</Label>
                <Textarea
                  id="product-description"
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="product-price">Price</Label>
                  <Input
                    id="product-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-stock">Stock</Label>
                  <Input
                    id="product-stock"
                    type="number"
                    min="0"
                    value={productForm.stock}
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        stock: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-min-stock">Min stock alert</Label>
                  <Input
                    id="product-min-stock"
                    type="number"
                    min="0"
                    value={productForm.min_stock_level}
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        min_stock_level: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-category">Category</Label>
                  <select
                    id="product-category"
                    value={productForm.category_id}
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        category_id: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  >
                    <option value="" disabled>
                      Select category
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                Add Product
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Existing Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No categories configured.
              </p>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded border p-4"
                >
                  <div>
                    <p className="font-semibold">{category.name}</p>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No products created yet.
              </p>
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded border p-4"
                >
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${Number(product.price).toFixed(2)} · Stock{" "}
                      {product.stock}
                    </p>
                    {product.category && (
                      <p className="text-xs text-muted-foreground">
                        Category: {product.category.name}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
