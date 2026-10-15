import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Category, CategoryInput, Product } from "@/lib/api";
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
  images: File[];
}

const defaultProductForm: ProductFormState = {
  name: "",
  description: "",
  price: "",
  stock: "",
  min_stock_level: "",
  category_id: "",
  images: [],
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
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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

  const handleCategoryEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      setSubmitting(true);
      await api.updateCategory(editingCategory.id, {
        name: editingCategory.name,
        description: editingCategory.description,
      });
      toast({ title: "Category updated" });
      setEditingCategory(null);
      await loadData();
    } catch (error) {
      toast({
        title: "Could not update category",
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

    try {
      setSubmitting(true);
      await api.createProduct({
        name: productForm.name,
        description: productForm.description,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        min_stock_level: Number(productForm.min_stock_level),
        category_id: Number(productForm.category_id),
        images: productForm.images,
      });
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

  const startEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      min_stock_level: String(product.min_stock_level),
      category_id: String(product.category_id ?? ""),
      images: [],
    });
  };

  const handleProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      setSubmitting(true);
      await api.updateProduct(editingProduct.id, {
        name: productForm.name,
        description: productForm.description,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        min_stock_level: Number(productForm.min_stock_level),
        category_id: Number(productForm.category_id),
        image: "",
      });
      toast({ title: "Product updated" });
      setEditingProduct(null);
      setProductForm(defaultProductForm);
      await loadData();
    } catch (error) {
      toast({
        title: "Could not update product",
        description:
          error instanceof Error ? error.message : "Please try again.",
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
              <div className="space-y-2">
                <Label htmlFor="product-image">Product Image</Label>
                <Input
                  id="product-image"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      images: Array.from(e.target.files ?? []),
                    }))
                  }
                />
                {productForm.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {productForm.images.map((file, idx) => (
                      <img
                        key={idx}
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-16 w-16 rounded object-cover border"
                      />
                    ))}
                  </div>
                )}
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

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Edit Category</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCategoryEdit}>
                <div className="space-y-2">
                  <Label htmlFor="edit-cat-name">Name</Label>
                  <Input
                    id="edit-cat-name"
                    value={editingCategory.name}
                    onChange={(e) =>
                      setEditingCategory((prev) =>
                        prev ? { ...prev, name: e.target.value } : prev
                      )
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cat-desc">Description</Label>
                  <Textarea
                    id="edit-cat-desc"
                    value={editingCategory.description ?? ""}
                    onChange={(e) =>
                      setEditingCategory((prev) =>
                        prev ? { ...prev, description: e.target.value } : prev
                      )
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingCategory(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Edit Product</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleProductEdit}>
                <div className="space-y-2">
                  <Label htmlFor="edit-prod-name">Name</Label>
                  <Input
                    id="edit-prod-name"
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
                  <Label htmlFor="edit-prod-desc">Description</Label>
                  <Textarea
                    id="edit-prod-desc"
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
                    <Label htmlFor="edit-prod-price">Price</Label>
                    <Input
                      id="edit-prod-price"
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
                    <Label htmlFor="edit-prod-stock">Stock</Label>
                    <Input
                      id="edit-prod-stock"
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
                    <Label htmlFor="edit-prod-min-stock">Min stock alert</Label>
                    <Input
                      id="edit-prod-min-stock"
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
                    <Label htmlFor="edit-prod-category">Category</Label>
                    <select
                      id="edit-prod-category"
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
                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm(defaultProductForm);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingCategory(category)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      Delete
                    </Button>
                  </div>
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditProduct(product)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
