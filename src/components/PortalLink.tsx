import Link from "next/link";
import type { ReactNode } from "react";

type PortalLinkProps = {
    href: string;
    children: ReactNode;
};
export default function PortalLink(props: PortalLinkProps) {
return (
    <Link href={props.href}>{props.children}</Link>
);
}