export type LinkSort = "newest" | "oldest" | "most" | "least" | "az";
export type LinkFilter = "all" | "clicked" | "unclicked";
export const LINK_SORTS: { value: LinkSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "most", label: "Most clicks" },
  { value: "least", label: "Fewest clicks" },
  { value: "az", label: "Name A–Z" },
];
export const LINK_FILTERS: { value: LinkFilter; label: string }[] = [
  { value: "all", label: "All links" },
  { value: "clicked", label: "With clicks" },
  { value: "unclicked", label: "No clicks yet" },
];
export const LINKS_PAGE_SIZE = 20;
