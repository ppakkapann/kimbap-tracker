"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getRememberedSalesPageDate,
  isValidSalesPageDate,
  salesPageHref,
} from "@/lib/sales-page-date";
import { format } from "date-fns";

export function useSalesNavHref() {
  const pathname = usePathname();
  const [href, setHref] = useState("/sales");

  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");

    if (pathname.startsWith("/sales") && typeof window !== "undefined") {
      const date = new URLSearchParams(window.location.search).get("date");
      if (isValidSalesPageDate(date, today)) {
        setHref(salesPageHref(date));
        return;
      }
    }

    setHref(salesPageHref(getRememberedSalesPageDate()));
  }, [pathname]);

  return href;
}
