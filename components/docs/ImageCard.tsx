import Image from "next/image";
import Link from "next/link";
import { LinkArrowIcon } from "nextra/icons";
import type { ReactNode } from "react";

type ImageCardProps = {
  title: string;
  description: string;
  href?: string;
  image?: string;
  imageAlt?: string;
  imageFit?: "cover" | "contain";
  children?: ReactNode;
};

export function ImageCardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose my-8 grid gap-6 sm:grid-cols-2">{children}</div>
  );
}

export function ImageCard({
  title,
  description,
  href,
  image,
  imageAlt,
  imageFit = "cover",
  children,
}: ImageCardProps) {
  const imageClassName =
    imageFit === "contain" ? "object-contain p-10" : "object-cover";

  return (
    <article className="not-prose group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none dark:hover:border-neutral-600">
      {image ? (
        <div className="relative aspect-[16/9] overflow-hidden border-b border-gray-200 bg-gray-100 dark:border-neutral-800 dark:bg-neutral-800">
          <Image
            src={image}
            alt={imageAlt ?? title}
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className={`${imageClassName} transition duration-500 group-hover:scale-[1.03]`}
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          {href ? (
            <Link
              href={href}
              className="transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            >
              {title}
              <LinkArrowIcon
                aria-hidden="true"
                height="1em"
                className="ml-1 inline align-baseline opacity-60 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          ) : (
            title
          )}
        </h3>
        <p className="mt-3 text-base leading-7 text-gray-600 dark:text-neutral-300">
          {description}
        </p>
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </article>
  );
}
