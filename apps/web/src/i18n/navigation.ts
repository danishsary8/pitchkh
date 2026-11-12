import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Locale-aware Link / router: hrefs stay "/venues", the locale prefix is added for you. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
