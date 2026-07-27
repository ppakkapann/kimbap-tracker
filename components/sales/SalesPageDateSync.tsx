"use client";

import { useEffect } from "react";
import { rememberSalesPageDate } from "@/lib/sales-page-date";

export function SalesPageDateSync({ selectedDate }: { selectedDate: string }) {
  useEffect(() => {
    rememberSalesPageDate(selectedDate);
  }, [selectedDate]);

  return null;
}
