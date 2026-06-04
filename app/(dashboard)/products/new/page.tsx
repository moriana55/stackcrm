import Link from "next/link";
import { createProduct } from "@/lib/actions";

const CATEGORIES = ["Bridal Gown", "Veil", "Tiara", "Accessories", "Bridesmaid", "Evening", "Other"];

export default function NewProductPage() {
  return (
    <div className="max-w-xl">
      <Link href="/products" className="text-sm text-gray-500 hover:text-gray-900 mb-4 inline-block">← Back to Products</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Product</h1>

      <form action={createProduct} className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
          <input name="name" required className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none text-sm" placeholder="e.g. Princess A-Line Gown" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select name="category" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none">
              <option value="">Select...</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <input name="sku" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none" placeholder="BG-001" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
            <input name="price" type="number" step="0.01" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($)</label>
            <input name="cost" type="number" step="0.01" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
            <input name="stock_quantity" type="number" defaultValue="1" min="0" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none resize-y" placeholder="Optional details..." />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">Save Product</button>
          <Link href="/products" className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
