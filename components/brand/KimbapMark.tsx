import Image from "next/image";

export function KimbapMark({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/icon.png"
      alt=""
      width={size}
      height={size}
      aria-hidden
      className="rounded-sm"
      priority
    />
  );
}
