"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function BasketBar({ itemCount, total }) {
  if (itemCount === 0) return null;

  return (
    <Link href="/checkout" className="basket-bar">
      <span>
        <b>{itemCount} {itemCount === 1 ? "meal" : "meals"}</b> ready to order
      </span>
      <strong>
        KSh {total} <ArrowRight size={17} />
      </strong>
    </Link>
  );
}