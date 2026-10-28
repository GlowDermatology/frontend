import { serializeJsonLd, type JsonLdNode } from "./json-ld";

/** One `<script type="application/ld+json">` with the escaped payload (server-rendered, no JS). */
export function JsonLd({ data }: { data: JsonLdNode | JsonLdNode[] }) {
  return (
    <script
      type="application/ld+json"
      // Escaped by `serializeJsonLd`: no `<`, `>` or `&` reaches the HTML parser.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
