import { redirect } from "next/navigation";

/** Catalog lives on `/`; keep `/catalog` as a permanent alias for bookmarks. */
export default function CatalogAliasRedirect() {
  redirect("/");
}
