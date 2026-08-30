"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DeleteProductButton } from "@/components/DeleteProductButton";

type Product = {
  id: string;
  code: string | null;
  name: string;
  category: { name: string };
  hasVariants: boolean;
  isActive: boolean;
  variants: { id: string }[];
  priceFrom: string;
  priceTo: string;
  totalStock: number;
  currentCostFrom: string;
  currentCostTo: string;
};

type SortKey = "code" | "name" | "stock" | "cost";

function moneyRange(from: string, to: string) {
  return from === to ? "$" + from : "$" + from + "–$" + to;
}

export function AdminProductsTable({ products }: { products: Product[] }) {
  const [sort, setSort] = useState<SortKey>("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  const rows = useMemo(() => [...products].sort((a, b) => {
    const left = sort === "code" ? (a.code ?? "") : sort === "name" ? a.name : sort === "stock" ? a.totalStock : Number(a.currentCostFrom);
    const right = sort === "code" ? (b.code ?? "") : sort === "name" ? b.name : sort === "stock" ? b.totalStock : Number(b.currentCostFrom);
    const comparison = typeof left === "string"
      ? left.localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" })
      : Number(left) - Number(right);
    return direction === "asc" ? comparison : -comparison;
  }), [products, sort, direction]);

  function sortBy(key: SortKey) {
    if (key === sort) setDirection((value) => value === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDirection("asc");
    }
  }

  function sortableLabel(key: SortKey, text: string) {
    const active = sort === key;
    return <button type="button" onClick={() => sortBy(key)} className="inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground">{text}<span aria-hidden="true" className={active ? "text-foreground" : "text-muted-foreground/60"}>{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span></button>;
  }

  return (
    <section className="card-dashboard overflow-hidden p-0">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <p className="section-kicker">Product catalogue</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">All products</h2>
          <p className="text-xs text-muted-foreground">Select a column heading to change the order.</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="table-head">
              <th className="px-5 py-3 text-left">{sortableLabel("code", "Product code")}</th>
              <th className="px-5 py-3 text-left">{sortableLabel("name", "Product name")}</th>
              <th className="px-5 py-3 text-left font-medium">Category</th>
              <th className="px-5 py-3 text-right">{sortableLabel("stock", "Stock quantity")}</th>
              <th className="px-5 py-3 text-right">{sortableLabel("cost", "Current cost")}</th>
              <th className="px-5 py-3 text-right font-medium">Selling price</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => (
              <tr key={product.id} className="table-row">
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{product.code ?? "—"}</td>
                <td className="px-5 py-3"><p className="font-semibold text-foreground">{product.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{product.hasVariants ? product.variants.length + " variants" : "Single product"}</p></td>
                <td className="px-5 py-3 text-muted-foreground">{product.category.name}</td>
                <td className="px-5 py-3 text-right font-medium tabular-nums">{product.totalStock}</td>
                <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{moneyRange(product.currentCostFrom, product.currentCostTo)}</td>
                <td className="px-5 py-3 text-right tabular-nums">{moneyRange(product.priceFrom, product.priceTo)}</td>
                <td className="whitespace-nowrap px-5 py-3 text-right text-xs">
                  <Link href={"/admin/products/" + product.id + "/edit"} className="font-medium text-primary hover:underline">View</Link>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <Link href={"/admin/products/" + product.id + "/edit"} className="font-medium text-primary hover:underline">Edit</Link>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <DeleteProductButton productId={product.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
