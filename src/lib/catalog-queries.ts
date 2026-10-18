import { queryOptions } from "@tanstack/react-query";
import { listTemplates } from "@/lib/builder.functions";
import { listCategories } from "@/lib/categories.functions";

export const templatesQuery = queryOptions({ queryKey: ["templates"], queryFn: () => listTemplates() });
export const categoriesQuery = queryOptions({ queryKey: ["categories"], queryFn: () => listCategories() });
