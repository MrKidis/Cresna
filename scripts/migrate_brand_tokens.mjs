import { readFileSync, writeFileSync } from "node:fs";
const files = ["client/src/pages/AIStudio.tsx", "client/src/pages/ConnectStore.tsx", "client/src/pages/OwnerPanel.tsx"];
const replacements = [
  ["bg-[#17201e]", "bg-brand-surface"],
  ["bg-[#d9fa55]", "bg-brand-accent"],
  ["text-[#d9fa55]", "text-brand-accent"],
  ["text-[#f8f7f2]", "text-brand-surface-foreground"],
  ["text-[#c7d0cb]", "text-brand-muted-foreground"],
  ["text-[#aeb9b2]", "text-brand-muted-foreground"],
  ["hover:bg-[#e7ff89]", "hover:bg-brand-accent"],
];
for (const file of files) {
  let source = readFileSync(file, "utf8");
  for (const [from, to] of replacements) source = source.split(from).join(to);
  writeFileSync(file, source);
}
